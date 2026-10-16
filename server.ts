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
  return new Promise((resolve) => {
    const fallbackResponse = () => {
      const dummy = Array(100).fill(12);
      return {
        peaks: dummy,
        base64Waveform: packTelegramWaveform(dummy),
        duration: 1.0
      };
    };

    // Decode audio into raw 16-bit signed LE PCM mono at 8000Hz
    const ffmpeg = spawn('/usr/bin/ffmpeg', [
      '-i', audioPath,
      '-map', '0:a:0',
      '-vn',
      '-sn',
      '-dn',
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
      try {
        if (code !== 0 && chunks.length === 0) {
          console.warn('Waveform extraction FFmpeg exited with code', code, stderr.slice(-150));
          return resolve(fallbackResponse());
        }

        const pcmBuffer = Buffer.concat(chunks);
        const totalSamples = Math.floor(pcmBuffer.length / 2);
        const duration = totalSamples / 8000;

        if (totalSamples === 0) {
          return resolve(fallbackResponse());
        }

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
            const byteIndex = j * 2;
            if (byteIndex + 1 < pcmBuffer.length) {
              const abs = Math.abs(pcmBuffer.readInt16LE(byteIndex));
              if (abs > maxVal) maxVal = abs;
            }
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
      } catch (err) {
        console.warn('Waveform processing error, using safe fallback:', err);
        resolve(fallbackResponse());
      }
    });

    ffmpeg.on('error', (err) => {
      console.warn('Waveform extraction process error:', err);
      resolve(fallbackResponse());
    });
  });
}

// Multer upload config (capped at 32MB for cloud network stability)
const upload = multer({
  dest: UPLOADS_DIR,
  limits: {
    fileSize: 32 * 1024 * 1024 // 32MB
  }
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Serve static files from public directory
  const publicDir = path.resolve(__dirname, 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
  }

  app.use(express.json({ limit: '35mb' }));
  app.use(express.urlencoded({ extended: true, limit: '35mb' }));

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

  // Audio Transcoding API with safe Multer error handling
  app.post('/api/convert', (req, res, next) => {
    upload.single('audio')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
              error: 'ফাইলের আকার অনেক বড়। অনুগ্রহ করে ২৮ মেগাবাইটের নিচের অডিও ফাইল আপলোড করুন।'
            });
          }
          return res.status(400).json({ error: `আপলোড ত্রুটি: ${err.message}` });
        }
        return res.status(400).json({ error: `অডিও আপলোড ত্রুটি: ${err.message || String(err)}` });
      }
      next();
    });
  }, async (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No audio file uploaded.' });
    }

    const {
      bitrate = '32k',
      opusApplication = 'voip',
      normalize = 'false',
      speechBoost = 'false',
      targetFormat = 'whatsapp'
    } = req.body;

    // Validate bitrate
    const validBitrates = ['24k', '32k', '48k', '64k'];
    const chosenBitrate = validBitrates.includes(bitrate) ? bitrate : '32k';

    const conversionId = crypto.randomUUID();
    const isWhatsApp = targetFormat === 'whatsapp';
    const isMessenger = targetFormat === 'messenger';
    const baseRawName = path.parse(file.originalname).name;
    
    let outputFileName = `${baseRawName}_voice.ogg`;
    if (isWhatsApp) {
      outputFileName = `${baseRawName}_whatsapp_voice.opus`;
    } else if (isMessenger) {
      outputFileName = `${baseRawName}_messenger_voice.opus`;
    }
    
    const outputPathOgg = path.join(OUTPUT_DIR, `${conversionId}.ogg`);
    const outputPathOpus = path.join(OUTPUT_DIR, `${conversionId}.opus`);
    // WhatsApp and Messenger use .opus container; Telegram uses .ogg container
    const primaryOutputPath = (isWhatsApp || isMessenger) ? outputPathOpus : outputPathOgg;

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

    const runFfmpegTranscode = (withFilters: boolean): Promise<{ success: boolean; stderr: string }> => {
      return new Promise((resP) => {
        const args: string[] = [
          '-i', file.path,
          '-map', '0:a:0', // Explicitly pick primary audio stream
          '-vn', // Strip artwork/video
          '-sn', // Strip subtitles
          '-dn', // Strip data streams
          '-map_metadata', '-1', // Strip ID3 tags that cause clients to treat as music
          '-c:a', 'libopus',
          '-b:a', chosenBitrate,
          '-vbr', 'on',
          '-compression_level', '10',
          '-application', opusApplication === 'audio' ? 'audio' : 'voip',
          '-ar', '48000', // Standard high-fidelity Opus sample rate
          '-ac', '1', // Voice messages MUST be mono
        ];

        if (withFilters && audioFilters.length > 0) {
          args.push('-af', audioFilters.join(','));
        }

        args.push(primaryOutputPath, '-y');

        const proc = spawn('/usr/bin/ffmpeg', args);
        let transcodeStderr = '';

        proc.stderr.on('data', (chunk) => {
          transcodeStderr += chunk.toString();
        });

        proc.on('close', (code) => {
          resP({ success: code === 0, stderr: transcodeStderr });
        });

        proc.on('error', (err) => {
          resP({ success: false, stderr: err.message });
        });
      });
    };

    const startTime = Date.now();
    let transcodeResult = await runFfmpegTranscode(audioFilters.length > 0);

    // If transcoding failed and audioFilters were enabled, retry once without filters for 100% reliability
    if (!transcodeResult.success && audioFilters.length > 0) {
      console.warn('Audio filter transcoding failed, retrying clean baseline transcode:', transcodeResult.stderr.slice(-200));
      transcodeResult = await runFfmpegTranscode(false);
    }

    // Safely remove original temp upload file
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (cleanupErr) {
      console.error('Error deleting temp upload:', cleanupErr);
    }

    if (!transcodeResult.success) {
      console.error('FFmpeg transcoding error:', transcodeResult.stderr);
      return res.status(500).json({
        error: 'ট্রান্সকোডিং সম্পন্ন করা সম্ভব হয়নি। অডিও ফাইলটি ত্রুটিযুক্ত অথবা অসমর্থিত ফরম্যাটের হতে পারে।',
        details: transcodeResult.stderr.slice(-300)
      });
    }

    try {
      // Also create the counterpart file so WhatsApp (.opus), Messenger (.opus), and Telegram (.ogg) are instantly ready
      if (isWhatsApp || isMessenger) {
        if (!fs.existsSync(outputPathOgg)) {
          fs.copyFileSync(primaryOutputPath, outputPathOgg);
        }
      } else {
        if (!fs.existsSync(outputPathOpus)) {
          fs.copyFileSync(primaryOutputPath, outputPathOpus);
        }
      }

      const stats = fs.statSync(primaryOutputPath);
      const originalSize = file.size;
      const convertedSize = stats.size;
      const compressionRatio = originalSize > 0
        ? Number(((1 - convertedSize / originalSize) * 100).toFixed(1))
        : 0;

      // Generate authentic Telegram waveform from the converted audio (with guaranteed fallback)
      const { peaks, base64Waveform, duration } = await extractWaveformFromAudio(primaryOutputPath);

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
        filePath: outputPathOgg,
        createdAt: Date.now()
      };

      voiceStore.set(conversionId, storedData);

      const downloadUrl = (isWhatsApp || isMessenger)
        ? `/api/audio/${conversionId}.opus`
        : `/api/audio/${conversionId}.ogg`;

      const normalizedFormat: 'whatsapp' | 'messenger' | 'telegram' = isWhatsApp
        ? 'whatsapp'
        : isMessenger
        ? 'messenger'
        : 'telegram';

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
        targetFormat: normalizedFormat,
        telegramWaveformBase64: base64Waveform,
        waveformPeaks: peaks,
        downloadUrl,
        whatsappDownloadUrl: `/api/audio/${conversionId}.opus`,
        messengerDownloadUrl: `/api/audio/${conversionId}.opus?app=messenger`,
        telegramDownloadUrl: `/api/audio/${conversionId}.ogg`,
        transcodeMs: Date.now() - startTime
      });
    } catch (finalErr: any) {
      console.error('Final response packaging error:', finalErr);
      return res.status(500).json({
        error: 'ভয়েস ফাইল তৈরি হয়েছে কিন্তু ফলাফল প্রস্তুত করতে সমস্যা হয়েছে।',
        details: finalErr?.message || String(finalErr)
      });
    }
  });

  // Stream or Download Converted Voice Message (.ogg or .opus)
  app.get('/api/audio/:file', (req, res) => {
    const fileParam = req.params.file;
    const match = fileParam.match(/^([a-f0-9-]+)\.(ogg|opus)$/i);
    if (!match) {
      return res.status(404).json({ error: 'Invalid audio path.' });
    }

    const id = match[1];
    const ext = match[2].toLowerCase();
    const voice = voiceStore.get(id);

    const filePath = path.join(OUTPUT_DIR, `${id}.${ext}`);
    // Fallback to .ogg or .opus if exact match is missing
    const fallbackPath = path.join(OUTPUT_DIR, `${id}.${ext === 'opus' ? 'ogg' : 'opus'}`);
    const finalPath = fs.existsSync(filePath) ? filePath : (fs.existsSync(fallbackPath) ? fallbackPath : null);

    if (!finalPath) {
      return res.status(404).json({ error: 'Audio file not found or expired.' });
    }

    const stat = fs.statSync(finalPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const baseName = voice ? path.parse(voice.originalName).name : 'voice_note';
    const appQuery = (req.query.app as string) || '';
    let suffix = 'voice';
    if (appQuery === 'messenger') {
      suffix = 'messenger_voice';
    } else if (ext === 'opus' || appQuery === 'whatsapp') {
      suffix = 'whatsapp_voice';
    }
    const rawName = `${baseName}_${suffix}.${ext}`;
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
      const fileStream = fs.createReadStream(finalPath, { start, end });
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
      fs.createReadStream(finalPath).pipe(res);
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

  // Explicit 404 handler for all /api routes to prevent Vite SPA fallback from returning index.html
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'এপিআই রুটটি খুঁজে পাওয়া যায়নি।' });
  });

  // Global API error handling middleware
  app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled API error:', err);
    if (!res.headersSent) {
      res.status(err.status || 500).json({
        error: err.message || 'সার্ভার অনুরোধ প্রক্রিয়া করতে ব্যর্থ হয়েছে।'
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
