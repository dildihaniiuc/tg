import React, { useState } from 'react';
import { Download, Send, Copy, Check, CheckCircle, ArrowDownRight, Share2, Loader2, Sparkles } from 'lucide-react';
import { ConversionResult } from '../types';
import { formatBytes, formatDuration, downloadAudioFile, shareAudioToTelegram } from '../utils/audio';

interface ConversionResultCardProps {
  result: ConversionResult;
  onOpenSendModal: () => void;
}

export const ConversionResultCard: React.FC<ConversionResultCardProps> = ({
  result,
  onOpenSendModal,
}) => {
  const [copiedWaveform, setCopiedWaveform] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadSuccess(false);
    const targetName = `${result.originalName.replace(/\.[^/.]+$/, '')}_voice.ogg`;
    
    try {
      await downloadAudioFile(result.downloadUrl, targetName);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Download trigger error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDirectShare = async () => {
    setIsSharing(true);
    const targetName = `${result.originalName.replace(/\.[^/.]+$/, '')}_voice.ogg`;
    try {
      await shareAudioToTelegram(result.downloadUrl, targetName);
    } catch (err) {
      console.error('Direct share error:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyWaveform = async () => {
    try {
      await navigator.clipboard.writeText(result.telegramWaveformBase64);
      setCopiedWaveform(true);
      setTimeout(() => setCopiedWaveform(false), 2000);
    } catch (err) {
      console.error('Failed to copy waveform:', err);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-emerald-500/30 bg-[#121824] p-5 sm:p-6 shadow-2xl">
      {/* Header Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              খাঁটি টেলিগ্রাম ভয়েস মেসেজে (.ogg) রূপান্তর সম্পন্ন!
            </h3>
            <p className="text-xs text-slate-400 font-mono truncate max-w-sm sm:max-w-md">
              {result.originalName} → {result.originalName.replace(/\.[^/.]+$/, '')}_voice.ogg
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400">
          <ArrowDownRight className="h-3.5 w-3.5" />
          <span className="font-mono tabular-nums">{result.compressionRatio}% সাইজ সাশ্রয়</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-white/[0.06] bg-[#0f1420]/70 p-3">
          <span className="text-[11px] font-medium text-slate-400 block">আসল সাইজ</span>
          <span className="font-mono text-sm font-semibold text-slate-300 tabular-nums">
            {formatBytes(result.originalSize)}
          </span>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#0f1420]/70 p-3">
          <span className="text-[11px] font-medium text-slate-400 block">টেলিগ্রাম ভয়েস সাইজ</span>
          <span className="font-mono text-sm font-semibold text-cyan-300 tabular-nums">
            {formatBytes(result.convertedSize)}
          </span>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#0f1420]/70 p-3">
          <span className="text-[11px] font-medium text-slate-400 block">সময়কাল</span>
          <span className="font-mono text-sm font-semibold text-white tabular-nums">
            {formatDuration(result.duration)}
          </span>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#0f1420]/70 p-3">
          <span className="text-[11px] font-medium text-slate-400 block">টেলিগ্রাম কোডেক</span>
          <span className="font-mono text-sm font-semibold text-purple-300 tabular-nums">
            Opus ৪৮kHz মনো
          </span>
        </div>
      </div>

      {/* Primary Actions: Guaranteed Download & Direct Telegram Share */}
      <div className="flex flex-col sm:flex-row items-stretch gap-3">
        {/* Direct Download Button with dynamic state */}
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
        >
          {isDownloading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>ডাউনলোড হচ্ছে...</span>
            </>
          ) : downloadSuccess ? (
            <>
              <Check className="h-4 w-4 text-emerald-200 stroke-[3]" />
              <span>ডাউনলোড সম্পন্ন হয়েছে!</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>ভয়েস ডাউনলোড করুন (.ogg)</span>
            </>
          )}
        </button>

        {/* Direct Telegram Share Button */}
        <button
          onClick={handleDirectShare}
          disabled={isSharing}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] transition-all cursor-pointer"
        >
          {isSharing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />
              <span>শেয়ার প্রস্তুত হচ্ছে...</span>
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4 text-cyan-300" />
              <span>সরাসরি টেলিগ্রামে শেয়ার করুন</span>
            </>
          )}
        </button>

        {/* Send via Telegram Bot API Button */}
        <button
          onClick={onOpenSendModal}
          className="sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-purple-600/40 border border-purple-500/40 px-4 py-3 text-sm font-semibold text-purple-200 hover:bg-purple-600 hover:text-white active:scale-[0.99] transition-all cursor-pointer"
          title="বট দিয়ে চ্যাটে গোল ভয়েস বাবল হিসেবে পাঠান"
        >
          <Send className="h-4 w-4 text-cyan-300" />
          <span>বট দিয়ে পাঠান</span>
        </button>
      </div>

      {/* Telegram 5-bit Waveform Metadata Box */}
      <div className="mt-5 rounded-xl border border-white/[0.06] bg-[#0f1420]/50 p-3.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>টেলিগ্রাম Bot API ৫-বিট ওয়েভফর্ম ডেটা:</span>
          </div>

          <button
            onClick={handleCopyWaveform}
            className="flex items-center gap-1 rounded bg-white/[0.06] px-2 py-1 text-[11px] font-mono text-slate-300 hover:bg-white/[0.1] hover:text-white transition-colors cursor-pointer"
          >
            {copiedWaveform ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">কপি হয়েছে!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Base64 কপি করুন</span>
              </>
            )}
          </button>
        </div>

        <div className="rounded bg-black/40 p-2 font-mono text-[11px] text-slate-400 break-all select-all border border-white/[0.04]">
          {result.telegramWaveformBase64}
        </div>

        <p className="mt-2 text-[11px] text-slate-400">
          এই ৬৩-বাইটের Base64 স্ট্রিংটি আপনার আসল অডিও থেকে ১০০টি ৫-বিট পিক বিশ্লেষণ করে তৈরি। টেলিগ্রামের <code className="text-cyan-300 font-mono">sendVoice</code> এ এটি দিলে টেলিগ্রাম অ্যাপ স্ক্রিনে সরাসরি বাস্তব ওয়েভফর্ম প্রদর্শন করে।
        </p>
      </div>
    </div>
  );
};
