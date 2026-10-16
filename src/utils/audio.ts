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
  const safeFilename = (filename.endsWith('.opus') || filename.endsWith('.ogg'))
    ? filename
    : (url.includes('.opus') ? `${filename}.opus` : `${filename}.ogg`);
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
 * 1-Click Direct Audio File Share to WhatsApp, Messenger, Telegram, etc.
 * Sends the pure audio file directly without sending any text links.
 * When files: [file] is passed alone, WhatsApp, Telegram, and Messenger receive
 * the actual audio/voice note file rather than a web link.
 */
export async function shareVoiceFileDirect(
  file: File,
  onFallbackDownload?: () => void
): Promise<{ success: boolean; isNative: boolean }> {
  // Check if browser supports native file sharing
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      // CRITICAL: Do NOT include 'text' or 'url' fields here!
      // When text or url is included, WhatsApp and Messenger often send the URL link
      // instead of attaching the actual audio voice memo!
      await navigator.share({
        files: [file],
      });
      return { success: true, isNative: true };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User closed or dismissed the share drawer
        return { success: true, isNative: true };
      }
      console.warn('Native file share failed:', err);
    }
  }

  // If native file sharing is not supported (e.g. desktop browsers):
  // Trigger instant direct download so the user can easily drop it into WhatsApp or Messenger
  if (onFallbackDownload) {
    onFallbackDownload();
  } else {
    const objectUrl = window.URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = file.name;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(objectUrl), 2000);
  }

  return { success: true, isNative: false };
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

/**
 * Robust JSON fetch wrapper that gracefully handles HTML error responses
 * from proxies, Cloud Run, and web servers without throwing "Unexpected token '<'"
 */
export async function safeJsonFetch<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  defaultErrorMessage = 'অনুরোধটি প্রক্রিয়া করা যায়নি।'
): Promise<T> {
  const response = await fetch(input, init);
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok || (data && data.ok === false) || (data && data.error)) {
      throw new Error(data.error || data.details || defaultErrorMessage);
    }
    return data;
  }

  // Not JSON! Server returned HTML or plaintext error
  const text = await response.text();
  if (response.status === 413 || text.includes('413') || text.toLowerCase().includes('too large')) {
    throw new Error('ফাইলের আকার অনেক বড় (সার্ভার লিমিট অতিক্রম করেছে)। অনুগ্রহ করে ২৮ MB এর নিচের ফাইল আপলোড করুন।');
  }
  if (response.status === 502 || response.status === 504) {
    throw new Error('সার্ভার গেটওয়ে রেসপন্স দেয়নি। অনুগ্রহ করে একটু পর আবার চেষ্টা করুন।');
  }
  if (response.status === 404) {
    throw new Error('এপিআই সার্ভার রুট খুঁজে পাওয়া যায়নি। অনুগ্রহ করে পেজটি রিফ্রেশ করুন।');
  }
  if (!response.ok) {
    throw new Error(`সার্ভার ত্রুটি (${response.status})। অনুগ্রহ করে আবার চেষ্টা করুন।`);
  }

  throw new Error(defaultErrorMessage);
}

