import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  FileAudio,
  Volume2,
  Leaf,
  MessageCircle,
  Send,
  Droplets,
  Sprout
} from 'lucide-react';
import { Header } from './components/Header';
import { AudioUploader } from './components/AudioUploader';
import { WaveformPlayer } from './components/WaveformPlayer';
import { ConversionSettingsPanel } from './components/ConversionSettingsPanel';
import { ConversionProgress } from './components/ConversionProgress';
import { ConversionResultCard } from './components/ConversionResultCard';
import { TelegramBotModal } from './components/TelegramBotModal';
import { ShareModal, MessengerIcon, WhatsAppIcon, TelegramIcon } from './components/ShareModal';
import { ConversionHistory } from './components/ConversionHistory';
import { extractBrowserWaveform, safeJsonFetch } from './utils/audio';
import { ConversionResult, ConversionSettings } from './types';

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sampleName, setSampleName] = useState<string | null>(null);
  const [originalAudioUrl, setOriginalAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [browserWaveformPeaks, setBrowserWaveformPeaks] = useState<number[]>([]);

  // Transcoding settings
  const [settings, setSettings] = useState<ConversionSettings>({
    bitrate: '32k',
    opusApplication: 'voip',
    normalize: false,
    speechBoost: false,
    targetFormat: 'messenger',
  });

  // Conversion process state
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [convertingTarget, setConvertingTarget] = useState<'whatsapp' | 'messenger' | 'telegram'>('messenger');
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<ConversionResult | null>(null);

  // Session conversion history
  const [history, setHistory] = useState<ConversionResult[]>([]);

  // Telegram Send Modal state
  const [isBotModalOpen, setIsBotModalOpen] = useState<boolean>(false);
  const [modalTargetResult, setModalTargetResult] = useState<ConversionResult | null>(null);

  // Social Share Hub Modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [modalShareTargetResult, setModalShareTargetResult] = useState<ConversionResult | null>(null);
  const [cachedVoiceFile, setCachedVoiceFile] = useState<File | null>(null);

  // Clean up object URLs on unmount or file change
  useEffect(() => {
    return () => {
      if (originalAudioUrl && originalAudioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(originalAudioUrl);
      }
    };
  }, [originalAudioUrl]);

  // Handle local file selection
  const handleFileSelected = async (file: File) => {
    if (originalAudioUrl && originalAudioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(originalAudioUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setSampleName(null);
    setOriginalAudioUrl(objectUrl);
    setCurrentResult(null);
    setConversionError(null);

    const { peaks, duration } = await extractBrowserWaveform(file);
    setBrowserWaveformPeaks(peaks);
    setAudioDuration(duration);
  };

  // Handle sample file selection
  const handleSampleSelected = async (samplePath: string, displayName: string) => {
    try {
      setConversionError(null);
      setCurrentResult(null);
      const res = await fetch(samplePath);
      const blob = await res.blob();
      const file = new File([blob], `${displayName.toLowerCase().replace(/\s+/g, '_')}.mp3`, {
        type: 'audio/mp3',
      });

      if (originalAudioUrl && originalAudioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(originalAudioUrl);
      }

      const objectUrl = URL.createObjectURL(file);
      setSelectedFile(file);
      setSampleName(displayName);
      setOriginalAudioUrl(objectUrl);

      const { peaks, duration } = await extractBrowserWaveform(file);
      setBrowserWaveformPeaks(peaks);
      setAudioDuration(duration);
    } catch (err) {
      console.error('Failed to load sample audio:', err);
      setConversionError('নির্বাচিত স্যাম্পল অডিও লোড করা যায়নি।');
    }
  };

  // Reset/Clear everything
  const handleClear = () => {
    if (originalAudioUrl && originalAudioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(originalAudioUrl);
    }
    setSelectedFile(null);
    setSampleName(null);
    setOriginalAudioUrl(null);
    setAudioDuration(0);
    setBrowserWaveformPeaks([]);
    setCurrentResult(null);
    setCachedVoiceFile(null);
    setConversionError(null);
  };

  // Run audio conversion via backend FFmpeg with explicit format choice
  const handleStartConversion = async (formatOverride?: 'whatsapp' | 'messenger' | 'telegram') => {
    if (!selectedFile) return;

    const chosenFormat = formatOverride || settings.targetFormat || 'messenger';
    setIsConverting(true);
    setConvertingTarget(chosenFormat);
    setConversionError(null);
    setCachedVoiceFile(null);

    try {
      const formData = new FormData();
      formData.append('audio', selectedFile);
      formData.append('bitrate', settings.bitrate);
      formData.append('opusApplication', settings.opusApplication);
      formData.append('normalize', String(settings.normalize));
      formData.append('speechBoost', String(settings.speechBoost));
      formData.append('targetFormat', chosenFormat);

      const data = await safeJsonFetch<any>(
        '/api/convert',
        {
          method: 'POST',
          body: formData,
        },
        'অডিও রূপান্তর ব্যর্থ হয়েছে।'
      );

      const result: ConversionResult = {
        id: data.id,
        originalName: data.originalName,
        originalSize: data.originalSize,
        convertedSize: data.convertedSize,
        duration: data.duration,
        sampleRate: data.sampleRate,
        channels: data.channels,
        bitrate: data.bitrate,
        compressionRatio: data.compressionRatio,
        targetFormat: data.targetFormat || chosenFormat,
        telegramWaveformBase64: data.telegramWaveformBase64,
        waveformPeaks: data.waveformPeaks,
        downloadUrl: data.downloadUrl,
        whatsappDownloadUrl: data.whatsappDownloadUrl,
        messengerDownloadUrl: data.messengerDownloadUrl || `/api/audio/${data.id}.opus?app=messenger`,
        telegramDownloadUrl: data.telegramDownloadUrl,
        createdAt: Date.now(),
        originalUrl: originalAudioUrl || undefined,
      };

      // Pre-cache audio File in memory for instant 1-click sharing
      try {
        const audioRes = await fetch(result.downloadUrl);
        const audioBlob = await audioRes.blob();
        const isMsg = result.targetFormat === 'messenger';
        const isWp = result.targetFormat === 'whatsapp';
        const baseName = result.originalName.replace(/\.[^/.]+$/, '');
        let safeName = `${baseName}_voice.ogg`;
        if (isMsg) {
          safeName = `${baseName}_messenger_voice.ogg`;
        } else if (isWp) {
          safeName = `${baseName}_whatsapp_voice.ogg`;
        }
        // audio/ogg is universally whitelisted by Android Chrome and iOS for Web Share API
        const preloadedFile = new File([audioBlob], safeName, {
          type: 'audio/ogg',
          lastModified: Date.now(),
        });
        setCachedVoiceFile(preloadedFile);
      } catch (cacheErr) {
        console.warn('Pre-cache audio file error:', cacheErr);
      }

      setCurrentResult(result);
      setHistory((prev) => [result, ...prev]);

      // Scroll smoothly to player
      setTimeout(() => {
        const el = document.getElementById('player-card-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error('Conversion failed:', err);
      setConversionError(err.message || 'অডিও রূপান্তরের সময় একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।');
    } finally {
      setIsConverting(false);
    }
  };

  const handleOpenBotModal = (resultToTarget?: ConversionResult | null) => {
    setModalTargetResult(resultToTarget || currentResult);
    setIsBotModalOpen(true);
  };

  const handleOpenShareModal = (resultToTarget?: ConversionResult | null) => {
    setModalShareTargetResult(resultToTarget || currentResult);
    setIsShareModalOpen(true);
  };

  const handleSelectHistoryItem = async (item: ConversionResult) => {
    setCurrentResult(item);
    window.scrollTo({ top: 300, behavior: 'smooth' });
    try {
      const audioRes = await fetch(item.downloadUrl);
      const audioBlob = await audioRes.blob();
      const isWp = item.targetFormat === 'whatsapp' || item.downloadUrl.includes('.opus');
      const baseName = item.originalName.replace(/\.[^/.]+$/, '');
      const safeName = isWp ? `${baseName}_whatsapp_voice.opus` : `${baseName}_voice.ogg`;
      setCachedVoiceFile(new File([audioBlob], safeName, { type: 'audio/ogg' }));
    } catch (e) {
      console.warn('Could not cache history voice file:', e);
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    if (currentResult?.id === id) {
      setCurrentResult(null);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-[#04120a] text-emerald-50 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Header */}
      <Header
        onOpenBotModal={() => handleOpenBotModal(currentResult)}
        activeConversionCount={history.length}
      />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-7">
        {/* Nature Themed Hero Section */}
        <section className="relative overflow-hidden rounded-3xl border border-emerald-800/40 bg-gradient-to-b from-[#072416]/90 via-[#051c11]/80 to-[#03140c]/90 p-6 sm:p-8 shadow-2xl text-center backdrop-blur-md">
          {/* Subtle Ambient Emerald Flora Glow */}
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-56 w-96 rounded-full bg-gradient-to-tr from-emerald-500/25 via-teal-500/15 to-lime-500/20 blur-3xl opacity-70" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/40 bg-emerald-950/60 px-3.5 py-1 text-xs font-semibold text-emerald-300 mb-3 backdrop-blur-md shadow-sm">
              <Leaf className="h-3.5 w-3.5 text-emerald-400" />
              <span>VoiceGram Nature · প্রকৃতির স্নিগ্ধতায় কণ্ঠস্বর</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              যেকোনো অডিওকে{' '}
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-lime-300 bg-clip-text text-transparent">
                খাঁটি ভয়েস মেসেজে
              </span>{' '}
              রূপান্তর করুন
            </h1>

            <p className="mt-2.5 text-xs sm:text-sm text-emerald-200/80 leading-relaxed max-w-lg mx-auto">
              MP3, WAV বা M4A অডিও দিন — WhatsApp (.opus) অথবা Telegram (.ogg) এর আলাদা বাটনে ক্লিক করে ১-ক্লিকে আসল ভয়েস পাঠান।
            </p>
          </div>
        </section>

        {/* Workspace: 2-Column or Stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Audio Source & Controls (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-emerald-100 tracking-tight flex items-center gap-2">
                <FileAudio className="h-4 w-4 text-emerald-400" />
                <span>অডিও নির্বাচন করুন</span>
              </h2>
              {selectedFile && (
                <button
                  onClick={handleClear}
                  disabled={isConverting}
                  className="flex items-center gap-1 text-xs text-emerald-400/80 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>রিসেট</span>
                </button>
              )}
            </div>

            {/* Upload Zone */}
            <AudioUploader
              currentFile={selectedFile}
              sampleName={sampleName}
              duration={audioDuration}
              onFileSelected={handleFileSelected}
              onSampleSelected={handleSampleSelected}
              onClear={handleClear}
              isConverting={isConverting}
            />

            {/* Smart Compact Audio Settings */}
            <ConversionSettingsPanel
              settings={settings}
              onChange={setSettings}
              disabled={isConverting}
            />

            {/* Error Banner */}
            {conversionError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3.5 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-rose-200">সমস্যা হয়েছে</h4>
                  <p className="mt-0.5 leading-relaxed">{conversionError}</p>
                </div>
              </div>
            )}

            {/* Converting Progress */}
            {isConverting && (
              <ConversionProgress
                fileName={selectedFile?.name || 'নির্বাচিত অডিও'}
                targetFormat={convertingTarget}
              />
            )}

            {/* DEDICATED SEPARATE BUTTONS FOR MESSENGER, TELEGRAM & WHATSAPP */}
            {!isConverting && selectedFile && !currentResult && (
              <div className="space-y-2.5 pt-1">
                <div className="text-xs font-semibold text-emerald-300/80 flex items-center justify-between">
                  <span>ভয়েস ফরম্যাট বাটন নির্বাচন করুন:</span>
                  <span className="text-[11px] text-cyan-400 font-normal">১-ক্লিক অটো কনভার্সন</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* SEPARATE BUTTON 1: Dedicated Messenger Voice Format Button (Mandatory & Top Priority) */}
                  <button
                    onClick={() => handleStartConversion('messenger')}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#0084FF] via-[#00B2FE] to-[#A824FB] hover:opacity-95 py-3.5 px-3 text-center text-white shadow-xl shadow-blue-950/70 active:scale-[0.99] transition-all cursor-pointer border border-blue-400/40 group relative overflow-hidden"
                  >
                    <div className="flex items-center gap-1.5">
                      <MessengerIcon className="h-4 w-4 text-white group-hover:scale-110 transition-transform" />
                      <span className="text-xs sm:text-sm font-bold">মেসেঞ্জার ভয়েস</span>
                    </div>
                    <span className="text-[10px] text-blue-100 font-medium">
                      .opus · আসল ভয়েস বাবল
                    </span>
                  </button>

                  {/* SEPARATE BUTTON 2: Dedicated Telegram Voice Format Button */}
                  <button
                    onClick={() => handleStartConversion('telegram')}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-teal-800 via-emerald-800 to-cyan-700 hover:from-teal-700 hover:to-cyan-600 py-3.5 px-3 text-center text-white shadow-xl shadow-emerald-950/70 active:scale-[0.99] transition-all cursor-pointer border border-teal-500/30 group"
                  >
                    <div className="flex items-center gap-1.5">
                      <TelegramIcon className="h-4 w-4 text-cyan-200 group-hover:scale-110 transition-transform" />
                      <span className="text-xs sm:text-sm font-bold">টেলিগ্রাম ভয়েস</span>
                    </div>
                    <span className="text-[10px] text-teal-200/90 font-medium">
                      .ogg · ৫-বিট ওয়েভফর্ম
                    </span>
                  </button>

                  {/* SEPARATE BUTTON 3: Dedicated WhatsApp Voice Format Button */}
                  <button
                    onClick={() => handleStartConversion('whatsapp')}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-[#25D366] hover:from-emerald-600 hover:to-teal-600 py-3.5 px-3 text-center text-white shadow-xl shadow-emerald-950/70 active:scale-[0.99] transition-all cursor-pointer border border-emerald-400/30 group"
                  >
                    <div className="flex items-center gap-1.5">
                      <WhatsAppIcon className="h-4 w-4 text-white group-hover:scale-110 transition-transform" />
                      <span className="text-xs sm:text-sm font-bold">WhatsApp ভয়েস</span>
                    </div>
                    <span className="text-[10px] text-emerald-100 font-medium">
                      .opus · PTT বাবল
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Player & Results (6 cols) */}
          <div id="player-card-section" className="lg:col-span-6 space-y-4">
            {selectedFile || currentResult ? (
              <div className="space-y-4">
                <WaveformPlayer
                  originalAudioUrl={originalAudioUrl}
                  convertedAudioUrl={currentResult?.downloadUrl}
                  peaks={currentResult?.waveformPeaks || browserWaveformPeaks}
                  originalName={selectedFile?.name || currentResult?.originalName || 'অডিও ভয়েস প্রিভিউ'}
                  duration={currentResult?.duration || audioDuration}
                  isConverted={!!currentResult}
                />

                {currentResult && (
                  <ConversionResultCard
                    result={currentResult}
                    onOpenSendModal={() => handleOpenBotModal(currentResult)}
                    onOpenShareModal={() => handleOpenShareModal(currentResult)}
                    cachedVoiceFile={cachedVoiceFile}
                    onReconvert={(format) => handleStartConversion(format)}
                    isReconverting={isConverting}
                  />
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-emerald-800/40 bg-[#051c11]/40 p-8 text-center flex flex-col items-center justify-center min-h-[280px] backdrop-blur-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-950/60 border border-emerald-700/40 text-emerald-400 mb-3">
                  <Volume2 className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-sm font-semibold text-emerald-50">প্রাকৃতিক ওয়েভফর্ম প্লেয়ার</h3>
                <p className="mt-1 text-xs text-emerald-300/70 max-w-xs leading-relaxed">
                  বাম পাশে একটি অডিও ফাইল আপলোড করুন অথবা টেস্ট স্যাম্পলে ক্লিক করুন।
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Session Conversion History */}
        <ConversionHistory
          history={history}
          activeId={currentResult?.id || null}
          onSelectResult={handleSelectHistoryItem}
          onOpenSendModal={handleOpenBotModal}
          onOpenShareModal={handleOpenShareModal}
          onDeleteResult={handleDeleteHistoryItem}
          onClearHistory={handleClearHistory}
        />
      </main>

      {/* Clean Minimal Nature Footer */}
      <footer className="w-full border-t border-emerald-900/40 bg-[#031008] py-5 text-xs text-emerald-400/70 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-emerald-200 flex items-center gap-1.5">
              <Leaf className="h-3.5 w-3.5 text-emerald-400" />
              <span>VoiceGram Nature (ভয়েসগ্রাম)</span>
            </span>
            <span>·</span>
            <span>Opus ৪৮kHz মনো অডিও</span>
          </div>
          <div className="text-emerald-400/80 text-[11px]">
            <span>WhatsApp (.opus) · Telegram (.ogg) · Messenger ১০০% আসল ভয়েস</span>
          </div>
        </div>
      </footer>

      {/* Telegram Bot SendVoice Modal */}
      <TelegramBotModal
        isOpen={isBotModalOpen}
        onClose={() => setIsBotModalOpen(false)}
        result={modalTargetResult}
      />

      {/* Social Share Hub Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        result={modalShareTargetResult}
        onOpenBotModal={() => handleOpenBotModal(modalShareTargetResult)}
        cachedVoiceFile={cachedVoiceFile}
      />
    </div>
  );
}
