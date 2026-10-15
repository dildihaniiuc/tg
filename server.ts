import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import multer from 'multer';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure storage directories exist
const UPLOADS_DIR = path.join('/tmp', 'televoice_uploads');
const OUTPUT_DIR = path.join('/tmp', 'televoice_output');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Metadata storage for converted files
interface StoredVoice {
  id: string;
  originalName: string;
  originalSize: number;
  convertedSize: number;
  duration: number;
  sampleRate: number;
  channels: number;
  bitrate: string;
  compressionRatio: number;
  telegramWaveformBase64: string;
  waveformPeaks: number[];
  filePath: string;
  createdAt: number;
}

const voiceStore = new Map<string, StoredVoice>();

// Cleanup stale files older than 45 minutes
setInterval(() => {
  const now = Date.now();
  const maxAge = 45 * 60 * 1000;
  for (const [id, voice] of voiceStore.entries()) {
    if (now - voice.createdAt > maxAge) {
      try {
        if (fs.existsSync(voice.filePath)) {
          fs.unlinkSync(voice.filePath);
        }
      } catch (err) {
        console.error('Error removing stale voice file:', err);
      }
      voiceStore.delete(id);
    }
  }
}, 10 * 60 * 1000);

// Helper to pack 100 5-bit samples into Telegram 63-byte base64 format
function packTelegramWaveform(samples5bit: number[]): string {
  const totalBits = samples5bit.length * 5;
  const totalBytes = Math.ceil(totalBits / 8);
  const buffer = Buffer.alloc(totalBytes, 0);

  for (let i = 0; i < samples5bit.length; i++) {
    const val = Math.max(0, Math.min(31, Math.round(samples5bit[i])));
    const bitIndex = i * 5;
    const byteIndex = Math.floor(bitIndex / 8);
    const bitOffset = bitIndex % 8;

    buffer[byteIndex] |= (val << bitOffset) & 0xff;
    if (bitOffset > 3 && byteIndex + 1 < totalBytes) {
      buffer[byteIndex + 1] |= (val >> (8 - bitOffset)) & 0xff;
    }
  }

  return buffer.toString('base64');
}

// Extract PCM samples at 8000Hz mono using FFmpeg and generate 100 authentic waveform peaks
async function extractWaveformFromAudio(audioPath: string): Promise<{ peaks: number[]; base64Waveform: string; duration: number }> {
  return new Promise((resolve, reject) => {
    // Decode audio into raw 16-bit signed LE PCM mono at 8000Hz
    const ffmpeg = spawn('/usr/bin/ffmpeg', [
      '-i', audioPath,
      '-ac', '1',
      '-ar', '8000',
      '-f', 's16le',
      '-'
    ]);

    const chunks: Buffer[] = [];
    ffmpeg.stdout.on('data', (chunk) => {
      chunks.push(chunk);
    });

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0 && chunks.length === 0) {
        return reject(new Error(`Waveform extraction failed: ${stderr.slice(-200)}`));
      }

      const pcmBuffer = Buffer.concat(chunks);
      const totalSamples = Math.floor(pcmBuffer.length / 2);
      const duration = totalSamples / 8000;

      if (totalSamples === 0) {
        const dummy = Array(100).fill(0);
        return resolve({
          peaks: dummy,
          base64Waveform: packTelegramWaveform(dummy),
          duration: 0
        });
      }

      const samples16 = new Int16Array(
        pcmBuffer.buffer,
        pcmBuffer.byteOffset,
        totalSamples
      );

      // Divide audio into 100 slices
      const numSlices = 100;
      const step = Math.max(1, Math.floor(totalSamples / numSlices));
      const slicePeaks: number[] = [];

      let globalMax = 0;
      for (let i = 0; i < numSlices; i++) {
        const start = Math.floor(i * step);
        const end = Math.min(totalSamples, Math.floor((i + 1) * step));
        let maxVal = 0;
        for (let j = start; j < end; j++) {
          const abs = Math.abs(samples16[j]);
          if (abs > maxVal) maxVal = abs;
        }
        slicePeaks.push(maxVal);
        if (maxVal > globalMax) globalMax = maxVal;
      }

      // Scale to 0..31 (5-bit integer range required by Telegram)
      const peaks5bit = slicePeaks.map((val) => {
        if (globalMax === 0) return 0;
        const normalized = val / globalMax;
        // Non-linear power scale (0.85) to enhance visual presence of quieter speech consonants
        const scaled = Math.round(Math.pow(normalized, 0.85) * 31);
        return Math.max(0, Math.min(31, scaled));
      });

      const base64Waveform = packTelegramWaveform(peaks5bit);
      resolve({
        peaks: peaks5bit,
        base64Waveform,
        duration: Math.max(0.1, Number(duration.toFixed(2)))
      });
    });

    ffmpeg.on('error', (err) => {
      reject(err);
    });
  });
}

// Multer upload config
const upload = multer({
  dest: UPLOADS_DIR,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  }
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Health Endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      engine: 'FFmpeg 4.4.2 + libopus',
      sampleRate: 48000,
      format: 'OGG/Opus (Telegram Voice)',
      uptime: process.uptime()
    });
  });

  // Audio Transcoding API
  app.post('/api/convert', upload.single('audio'), async (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No audio file uploaded.' });
    }

    const {
      bitrate = '32k',
      opusApplication = 'voip',
      normalize = 'false',
      speechBoost = 'false'
    } = req.body;

    // Validate bitrate
    const validBitrates = ['24k', '32k', '48k', '64k'];
    const chosenBitrate = validBitrates.includes(bitrate) ? bitrate : '32k';

    const conversionId = crypto.randomUUID();
    const outputFileName = `${path.parse(file.originalname).name}_voice.ogg`;
    const outputPath = path.join(OUTPUT_DIR, `${conversionId}.ogg`);

    // Audio filter configuration
    const audioFilters: string[] = [];
    if (normalize === 'true') {
      // EBU R128 loudness normalization
      audioFilters.push('loudnorm=I=-16:TP=-1.5:LRA=11');
    }
    if (speechBoost === 'true') {
      // Subtle high-pass at 100Hz and gentle speech clarity boost at 2.5kHz
      audioFilters.push('highpass=f=100', 'equalizer=f=2500:t=q:w=1.2:g=3');
    }

    const ffmpegArgs: string[] = [
      '-i', file.path,
      '-vn', // Strip any artwork/video streams
      '-map_metadata', '-1', // Strip ID3 tags that cause clients to treat as music
      '-c:a', 'libopus',
      '-b:a', chosenBitrate,
      '-vbr', 'on',
      '-compression_level', '10',
      '-application', opusApplication === 'audio' ? 'audio' : 'voip',
      '-ar', '48000', // Telegram native Opus sample rate
      '-ac', '1', // Telegram voice messages MUST be mono
    ];

    if (audioFilters.length > 0) {
      ffmpegArgs.push('-af', audioFilters.join(','));
    }

    ffmpegArgs.push(outputPath, '-y');

    const startTime = Date.now();
    const ffmpegProc = spawn('/usr/bin/ffmpeg', ffmpegArgs);

    let stderr = '';
    ffmpegProc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    ffmpegProc.on('close', async (code) => {
      // Remove original upload file
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (err) {
        console.error('Error deleting temp upload:', err);
      }

      if (code !== 0) {
        console.error('FFmpeg transcoding error:', stderr);
        return res.status(500).json({
          error: 'Transcoding failed. The audio file might be corrupted or in an unsupported format.',
          details: stderr.slice(-300)
        });
      }

      try {
        const stats = fs.statSync(outputPath);
        const originalSize = file.size;
        const convertedSize = stats.size;
        const compressionRatio = originalSize > 0
          ? Number(((1 - convertedSize / originalSize) * 100).toFixed(1))
          : 0;

        // Generate authentic Telegram waveform from the converted audio
        const { peaks, base64Waveform, duration } = await extractWaveformFromAudio(outputPath);

        const storedData: StoredVoice = {
          id: conversionId,
          originalName: file.originalname,
          originalSize,
          convertedSize,
          duration,
          sampleRate: 48000,
          channels: 1,
          bitrate: chosenBitrate,
          compressionRatio,
          telegramWaveformBase64: base64Waveform,
          waveformPeaks: peaks,
          filePath: outputPath,
          createdAt: Date.now()
        };

        voiceStore.set(conversionId, storedData);

        return res.json({
          id: conversionId,
          filename: outputFileName,
          originalName: file.originalname,
          originalSize,
          convertedSize,
          duration,
          sampleRate: 48000,
          channels: 1,
          bitrate: chosenBitrate,
          compressionRatio,
          telegramWaveformBase64: base64Waveform,
          waveformPeaks: peaks,
          downloadUrl: `/api/audio/${conversionId}.ogg`,
          transcodeMs: Date.now() - startTime
        });
      } catch (extractErr: any) {
        console.error('Waveform or metadata extraction error:', extractErr);
        return res.status(500).json({
          error: 'Converted audio was generated but metadata analysis failed.',
          details: extractErr?.message || String(extractErr)
        });
      }
    });

    ffmpegProc.on('error', (err) => {
      return res.status(500).json({
        error: 'Failed to launch FFmpeg process.',
        details: err.message
      });
    });
  });

  // Stream or Download Converted Voice Message
  app.get('/api/audio/:id.ogg', (req, res) => {
    const { id } = req.params;
    const voice = voiceStore.get(id);

    const filePath = path.join(OUTPUT_DIR, `${id}.ogg`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found or expired.' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const rawName = voice ? `${path.parse(voice.originalName).name}_voice.ogg` : 'telegram_voice.ogg';
    // Clean filename for HTTP header
    const safeAsciiName = rawName.replace(/[^\w.-]/g, '_');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
    res.setHeader('Content-Type', 'audio/ogg; codecs=opus');
    res.setHeader('Accept-Ranges', 'bytes');

    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${encodeURIComponent(rawName)}`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${safeAsciiName}"`);
    }

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': chunksize,
        'Content-Type': 'audio/ogg; codecs=opus',
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'audio/ogg; codecs=opus',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });

  // Telegram Bot Token Verification (getMe)
  app.post('/api/telegram/test-bot', async (req, res) => {
    const { botToken } = req.body;
    if (!botToken || typeof botToken !== 'string') {
      return res.status(400).json({ error: 'Bot token is required.' });
    }

    const cleanToken = botToken.trim();
    if (!/^\d+:[\w-]{35,}$/.test(cleanToken)) {
      return res.status(400).json({ error: 'Invalid token format. A typical Telegram Bot token looks like "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ".' });
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
      const data = await response.json() as { ok: boolean; description?: string; result?: any };

      if (!data.ok) {
        return res.status(400).json({
          ok: false,
          error: data.description || 'Telegram rejected this bot token.'
        });
      }

      return res.json({
        ok: true,
        bot: data.result
      });
    } catch (err: any) {
      return res.status(502).json({
        ok: false,
        error: 'Failed to connect to Telegram Bot API servers. Please check your network or try again.'
      });
    }
  });

  // Telegram Send Voice Message (sendVoice)
  app.post('/api/telegram/send', async (req, res) => {
    const { botToken, chatId, caption, audioId, customWaveform } = req.body;

    if (!botToken || !chatId || !audioId) {
      return res.status(400).json({ error: 'botToken, chatId, and audioId are required.' });
    }

    const cleanToken = String(botToken).trim();
    const cleanChatId = String(chatId).trim();

    const voice = voiceStore.get(audioId);
    const filePath = path.join(OUTPUT_DIR, `${audioId}.ogg`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Voice file has expired or does not exist. Please re-convert.' });
    }

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const waveformToSend = customWaveform || voice?.telegramWaveformBase64 || '';
      const durationSeconds = voice ? Math.round(voice.duration) : undefined;

      // Construct native FormData with Blob for multipart/form-data
      const formData = new FormData();
      formData.append('chat_id', cleanChatId);
      
      const fileBlob = new Blob([fileBuffer], { type: 'audio/ogg' });
      formData.append('voice', fileBlob, 'voice.ogg');

      if (caption && caption.trim()) {
        formData.append('caption', caption.trim().slice(0, 1024));
      }

      if (durationSeconds && durationSeconds > 0) {
        formData.append('duration', durationSeconds.toString());
      }

      if (waveformToSend) {
        formData.append('waveform', waveformToSend);
      }

      const telegramResponse = await fetch(`https://api.telegram.org/bot${cleanToken}/sendVoice`, {
        method: 'POST',
        body: formData
      });

      const result = await telegramResponse.json() as { ok: boolean; description?: string; error_code?: number; result?: any };

      if (!result.ok) {
        let helpNote = '';
        if (result.description?.includes('chat not found')) {
          helpNote = ' Make sure you have started a chat with your bot first (click /start in the bot chat), or that the bot is added to the channel/group.';
        } else if (result.description?.includes('Unauthorized')) {
          helpNote = ' Please verify your bot token with @BotFather.';
        } else if (result.description?.includes('bot was blocked')) {
          helpNote = ' The recipient has blocked this bot. Please unblock and press /start.';
        }

        return res.status(400).json({
          ok: false,
          error: `${result.description || 'Telegram failed to send voice message.'}${helpNote}`
        });
      }

      const msg = result.result;
      return res.json({
        ok: true,
        messageId: msg?.message_id,
        chat: {
          id: msg?.chat?.id,
          title: msg?.chat?.title || msg?.chat?.first_name || '',
          username: msg?.chat?.username || ''
        }
      });
    } catch (err: any) {
      console.error('Error calling Telegram sendVoice:', err);
      return res.status(502).json({
        ok: false,
        error: 'Network error communicating with Telegram Bot API.',
        details: err?.message || String(err)
      });
    }
  });

  // Setup Vite development middlewares or production static serving
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`TeleVoice Converter server running on port ${PORT} [${isProd ? 'production' : 'development'}]`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
