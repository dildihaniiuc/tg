import React, { useState, useEffect } from 'react';
import {
  Radio,
  Sparkles,
  ArrowRight,
  Download,
  Send,
  RotateCcw,
  AlertCircle,
  FileAudio,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { Header } from './components/Header';
import { AudioUploader } from './components/AudioUploader';
import { WaveformPlayer } from './components/WaveformPlayer';
import { ConversionSettingsPanel } from './components/ConversionSettingsPanel';
import { ConversionProgress } from './components/ConversionProgress';
import { ConversionResultCard } from './components/ConversionResultCard';
import { TelegramBotModal } from './components/TelegramBotModal';
import { TelegramExplanation } from './components/TelegramExplanation';
import { ConversionHistory } from './components/ConversionHistory';
import { extractBrowserWaveform } from './utils/audio';
import { ConversionResult, ConversionSettings } from './types';

// Hero visual asset
const HERO_IMAGE_PATH = '/src/assets/images/televoice_soundwave_hero_1792058215000.jpg';

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
  });

  // Conversion process state
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<ConversionResult | null>(null);

  // Session conversion history
  const [history, setHistory] = useState<ConversionResult[]>([]);

  // Telegram Send Modal state
  const [isBotModalOpen, setIsBotModalOpen] = useState<boolean>(false);
  const [modalTargetResult, setModalTargetResult] = useState<ConversionResult | null>(null);

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

    // Extract quick waveform preview from the uploaded audio file
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
      setConversionError('নির্বাচিত স্যাম্পল অডিও লোড করা যায়নি। অন্য একটি চেষ্টা করুন বা নিজের ফাইল আপলোড করুন।');
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
    setConversionError(null);
  };

  // Run audio conversion via backend FFmpeg
  const handleStartConversion = async () => {
    if (!selectedFile) return;

    setIsConverting(true);
    setConversionError(null);

    try {
      const formData = new FormData();
      formData.append('audio', selectedFile);
      formData.append('bitrate', settings.bitrate);
      formData.append('opusApplication', settings.opusApplication);
      formData.append('normalize', String(settings.normalize));
      formData.append('speechBoost', String(settings.speechBoost));

      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || data.details || 'অডিও রূপান্তর ব্যর্থ হয়েছে।');
      }

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
        telegramWaveformBase64: data.telegramWaveformBase64,
        waveformPeaks: data.waveformPeaks,
        downloadUrl: data.downloadUrl,
        createdAt: Date.now(),
        originalUrl: originalAudioUrl || undefined,
      };

      setCurrentResult(result);
      setHistory((prev) => [result, ...prev]);

      // Scroll smoothly to result
      setTimeout(() => {
        const el = document.getElementById('waveform-preview-section');
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

  const handleSelectHistoryItem = (item: ConversionResult) => {
    setCurrentResult(item);
    window.scrollTo({ top: 300, behavior: 'smooth' });
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

  const handleScrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-purple-600/30 selection:text-purple-200">
      {/* Top Bar Navigation */}
      <Header
        onOpenBotModal={() => handleOpenBotModal(currentResult)}
        onScrollToSection={handleScrollToSection}
        activeConversionCount={history.length}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-10">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101622] p-6 sm:p-10 shadow-2xl">
          {/* Background Visual Texture with Scrim */}
          <div className="absolute inset-0 pointer-events-none opacity-25">
            <img
              src={HERO_IMAGE_PATH}
              alt="TeleVoice Waveform Visualizer"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0b0f17] via-[#0b0f17]/90 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f17] via-transparent to-transparent" />
          </div>

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/40 px-3.5 py-1 text-xs font-semibold text-purple-300 mb-4 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>খাঁটি টেলিগ্রাম-সামঞ্জস্যপূর্ণ ভয়েস মেসেজ রূপান্তরকারী</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white text-balance leading-tight">
              যেকোনো অডিও ফাইলকে{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                খাঁটি টেলিগ্রাম ভয়েস মেসেজে
              </span>{' '}
              রূপান্তর করুন
            </h1>

            <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl text-balance">
              MP3, WAV, M4A, এবং FLAC ফাইলগুলোকে সরাসরি টেলিগ্রাম-সামঞ্জস্যপূর্ণ OGG/Opus ফরম্যাটে (৪৮&nbsp;kHz মনো) রূপান্তর করুন। সাথে রয়েছে ৫-বিট ওয়েভফর্ম, সরাসরি টেলিগ্রামে শেয়ার এবং নির্ভরযোগ্য ডাউনলোড সুবিধা।
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                <span>OGG/Opus খাঁটি রূপান্তর</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                <span>৪৮,০০০ Hz মনো সাউন্ড</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                <span>১০০-স্লাইস ৫-বিট ওয়েভফর্ম</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                <span>সরাসরি টেলিগ্রামে শেয়ার ও ডাউনলোড</span>
              </div>
            </div>
          </div>
        </section>

        {/* Converter Workspace */}
        <div id="converter-section" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Upload & Transcoder Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <FileAudio className="h-5 w-5 text-cyan-400" />
                  <span>অডিও ফাইল সোর্স</span>
                </h2>
                {selectedFile && (
                  <button
                    onClick={handleClear}
                    disabled={isConverting}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
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
            </div>

            {/* Transcoder Audio Settings */}
            <ConversionSettingsPanel
              settings={settings}
              onChange={setSettings}
              disabled={isConverting}
            />

            {/* Error Banner */}
            {conversionError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-300">
                <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-rose-200">রূপান্তর ত্রুটি</h4>
                  <p className="mt-0.5 leading-relaxed">{conversionError}</p>
                </div>
              </div>
            )}

            {/* Conversion Progress State */}
            {isConverting && (
              <ConversionProgress fileName={selectedFile?.name || 'নির্বাচিত অডিও'} />
            )}

            {/* Action Bar */}
            {!isConverting && selectedFile && !currentResult && (
              <button
                onClick={handleStartConversion}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 py-3.5 px-6 text-sm font-bold text-white shadow-xl shadow-purple-600/20 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-400 active:scale-[0.99] transition-all cursor-pointer"
              >
                <Radio className="h-4 w-4 text-cyan-200" />
                <span>টেলিগ্রাম ভয়েস মেসেজে (.ogg) রূপান্তর করুন</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Right Column: Waveform Preview & Result Card (5 cols) */}
          <div id="waveform-preview-section" className="lg:col-span-5 space-y-6">
            {/* Waveform Player */}
            {selectedFile || currentResult ? (
              <div className="space-y-6">
                <WaveformPlayer
                  originalAudioUrl={originalAudioUrl}
                  convertedAudioUrl={currentResult?.downloadUrl}
                  peaks={currentResult?.waveformPeaks || browserWaveformPeaks}
                  originalName={selectedFile?.name || currentResult?.originalName || 'অডিও ভয়েস প্রিভিউ'}
                  duration={currentResult?.duration || audioDuration}
                  isConverted={!!currentResult}
                />

                {/* Conversion Result Card if converted */}
                {currentResult && (
                  <ConversionResultCard
                    result={currentResult}
                    onOpenSendModal={() => handleOpenBotModal(currentResult)}
                  />
                )}
              </div>
            ) : (
              /* Empty Placeholder State */
              <div className="rounded-2xl border border-dashed border-white/[0.1] bg-[#121824]/40 p-8 text-center flex flex-col items-center justify-center min-h-[320px]">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.08] text-slate-500 mb-3">
                  <Radio className="h-7 w-7 text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold text-white">ওয়েভফর্ম অডিওর অপেক্ষায়</h3>
                <p className="mt-1 text-xs text-slate-400 max-w-xs leading-relaxed">
                  বাম পাশে একটি অডিও ফাইল আপলোড করুন অথবা টেস্ট স্যাম্পলে ক্লিক করে রূপান্তর শুরু করুন।
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
          onDeleteResult={handleDeleteHistoryItem}
          onClearHistory={handleClearHistory}
        />

        {/* Telegram Technical Architecture & Compatibility Specs */}
        <TelegramExplanation />
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/[0.08] bg-[#090d14] py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">টেলিভয়েস কনভার্টার</span>
            <span>·</span>
            <span>৪৮kHz মনো OGG/Opus ট্রান্সকোডিং</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>RFC 6716 Opus স্ট্যান্ডার্ড</span>
            <span>·</span>
            <span>টেলিগ্রাম Bot API sendVoice</span>
          </div>
        </div>
      </footer>

      {/* Telegram Bot SendVoice Modal */}
      <TelegramBotModal
        isOpen={isBotModalOpen}
        onClose={() => setIsBotModalOpen(false)}
        result={modalTargetResult}
      />
    </div>
  );
}
