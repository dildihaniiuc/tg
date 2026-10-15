export interface ConversionSettings {
  bitrate: '24k' | '32k' | '48k' | '64k';
  opusApplication: 'voip' | 'audio';
  normalize: boolean;
  speechBoost: boolean;
}

export interface AudioMetadata {
  name: string;
  size: number;
  type: string;
  duration?: number;
  url: string;
}

export interface ConversionResult {
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
  downloadUrl: string;
  createdAt: number;
  originalUrl?: string;
}

export interface TelegramBotInfo {
  id: number;
  first_name: string;
  username: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
}

export interface TelegramSendState {
  isSending: boolean;
  success: boolean;
  messageId?: number;
  chatTitle?: string;
  chatUsername?: string;
  error?: string;
  lastSentAt?: number;
}
