/**
 * Format seconds into mm:ss display
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '০০:০০';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format bytes into human-readable string
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '০ বাইট';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['বাইট', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Robust audio download using Blob and ObjectURL
 * Guarantees download triggers across all browsers and iframe sandboxes
 */
export async function downloadAudioFile(url: string, filename: string): Promise<boolean> {
  const safeFilename = filename.endsWith('.ogg') ? filename : `${filename}.ogg`;
  try {
    const downloadUrl = url.includes('?') ? `${url}&download=1` : `${url}?download=1`;
    const res = await fetch(downloadUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = safeFilename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 2000);
    return true;
  } catch (err) {
    console.warn('Direct blob download failed, falling back to link click:', err);
    const link = document.createElement('a');
    link.href = url.includes('?') ? `${url}&download=1` : `${url}?download=1`;
    link.download = safeFilename;
    link.target = '_blank';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return false;
  }
}

/**
 * Share voice file directly to Telegram (via Web Share API or Telegram Web)
 */
export async function shareAudioToTelegram(audioUrl: string, filename: string): Promise<'native-share' | 'telegram-web' | 'failed'> {
  const safeFilename = filename.endsWith('.ogg') ? filename : `${filename}.ogg`;
  try {
    const downloadUrl = audioUrl.includes('?') ? `${audioUrl}&download=1` : `${audioUrl}?download=1`;
    const res = await fetch(downloadUrl);
    const blob = await res.blob();
    const file = new File([blob], safeFilename, {
      type: 'audio/ogg; codecs=opus',
    });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'টেলিগ্রাম ভয়েস মেসেজ',
        text: 'টেলিভয়েস কনভার্টার দিয়ে তৈরি খাঁটি টেলিগ্রাম ভয়েস মেসেজ',
      });
      return 'native-share';
    }
  } catch (err) {
    console.warn('Web Share API error or dismissed:', err);
  }

  // Fallback: Open Telegram direct share dialog
  const absoluteUrl = audioUrl.startsWith('http') ? audioUrl : window.location.origin + audioUrl;
  const shareText = encodeURIComponent('টেলিভয়েস কনভার্টার দিয়ে তৈরি টেলিগ্রাম ভয়েস মেসেজ');
  window.open(`https://t.me/share/url?url=${encodeURIComponent(absoluteUrl)}&text=${shareText}`, '_blank');
  return 'telegram-web';
}

/**
 * Decode audio buffer using browser Web Audio API to extract 100 peak samples
 */
export async function extractBrowserWaveform(file: File | Blob): Promise<{ peaks: number[]; duration: number }> {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const channelData = audioBuffer.getChannelData(0);
    const totalSamples = channelData.length;
    const duration = audioBuffer.duration;
    
    const numSlices = 100;
    const step = Math.max(1, Math.floor(totalSamples / numSlices));
    const slicePeaks: number[] = [];

    let maxPeak = 0;
    for (let i = 0; i < numSlices; i++) {
      const start = Math.floor(i * step);
      const end = Math.min(totalSamples, Math.floor((i + 1) * step));
      let peak = 0;
      for (let j = start; j < end; j++) {
        const val = Math.abs(channelData[j]);
        if (val > peak) peak = val;
      }
      slicePeaks.push(peak);
      if (peak > maxPeak) maxPeak = peak;
    }

    const peaks5bit = slicePeaks.map((p) => {
      if (maxPeak === 0) return 0;
      const normalized = p / maxPeak;
      const scaled = Math.round(Math.pow(normalized, 0.85) * 31);
      return Math.max(0, Math.min(31, scaled));
    });

    await audioContext.close();
    return { peaks: peaks5bit, duration };
  } catch (err) {
    console.warn('Browser audio decoding skipped, falling back to server waveform:', err);
    return { peaks: Array(100).fill(10), duration: 0 };
  }
}

/**
 * Unpack Telegram 63-byte base64 waveform into 100 5-bit integers (0..31)
 */
export function unpackTelegramWaveform(base64: string): number[] {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const samples: number[] = [];
    for (let i = 0; i < 100; i++) {
      const bitIndex = i * 5;
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      let val = (bytes[byteIndex] >> bitOffset) & 0x1f;
      if (bitOffset > 3 && byteIndex + 1 < bytes.length) {
        val |= (bytes[byteIndex + 1] << (8 - bitOffset)) & 0x1f;
      }
      samples.push(val);
    }
    return samples;
  } catch (err) {
    console.error('Failed to unpack Telegram waveform:', err);
    return Array(100).fill(12);
  }
}
