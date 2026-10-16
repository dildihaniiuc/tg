import React, { useState } from 'react';
import {
  Download,
  Send,
  Check,
  ArrowDownRight,
  Share2,
  Loader2,
  Leaf,
  Sparkles,
  Smartphone,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { ConversionResult } from '../types';
import { formatBytes, formatDuration, downloadAudioFile } from '../utils/audio';
import { MessengerIcon, WhatsAppIcon, TelegramIcon } from './ShareModal';

interface ConversionResultCardProps {
  result: ConversionResult;
  onOpenSendModal: () => void;
  onOpenShareModal: () => void;
  cachedVoiceFile?: File | null;
  onReconvert?: (format: 'messenger' | 'telegram' | 'whatsapp') => void;
  isReconverting?: boolean;
}

export const ConversionResultCard: React.FC<ConversionResultCardProps> = ({
  result,
  onOpenSendModal,
  onOpenShareModal,
  cachedVoiceFile,
  onReconvert,
  isReconverting = false,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isSharingMessenger, setIsSharingMessenger] = useState(false);
  const [isSharingAll, setIsSharingAll] = useState(false);
  const [shareNotice, setShareNotice] = useState<{ message: string; isError?: boolean } | null>(null);

  const activeFormat = result.targetFormat || 'messenger';
  const baseName = result.originalName.replace(/\.[^/.]+$/, '');

  const messengerDownloadName = `${baseName}_messenger_voice.opus`;
  const wpDownloadName = `${baseName}_whatsapp_voice.opus`;
  const tgDownloadName = `${baseName}_voice.ogg`;

  const messengerUrl = result.messengerDownloadUrl || `/api/audio/${result.id}.opus?app=messenger`;
  const wpUrl = result.whatsappDownloadUrl || `/api/audio/${result.id}.opus`;
  const tgUrl = result.telegramDownloadUrl || `/api/audio/${result.id}.ogg`;

  let currentDownloadFileName = messengerDownloadName;
  let currentDownloadUrl = messengerUrl;
  let formatBadgeText = 'মেসেঞ্জার ভয়েস ফরম্যাট (.opus)';
  let formatBadgeTheme = 'bg-blue-950/80 border-blue-500/50 text-blue-300';

  if (activeFormat === 'telegram') {
    currentDownloadFileName = tgDownloadName;
    currentDownloadUrl = tgUrl;
    formatBadgeText = 'টেলিগ্রাম ভয়েস ফরম্যাট (.ogg)';
    formatBadgeTheme = 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300';
  } else if (activeFormat === 'whatsapp') {
    currentDownloadFileName = wpDownloadName;
    currentDownloadUrl = wpUrl;
    formatBadgeText = 'WhatsApp ভয়েস ফরম্যাট (.opus)';
    formatBadgeTheme = 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300';
  }

  // Get shareable File object formatted with audio/ogg
  // NOTE: Android Chrome only allows whitelisted MIME types for Web Share API.
  // audio/ogg is universally whitelisted, whereas audio/opus is rejected by Android Chrome!
  const getShareableFile = async (prefix: string = 'messenger'): Promise<File> => {
    if (cachedVoiceFile && cachedVoiceFile.type === 'audio/ogg') {
      return cachedVoiceFile;
    }

    const res = await fetch(`${currentDownloadUrl}?download=1`);
    if (!res.ok) throw new Error('অডিও ফাইল লোড করতে সমস্যা হয়েছে');
    const blob = await res.blob();

    // Use audio/ogg container for seamless mobile OS share recognition
    return new File([blob], `${baseName}_${prefix}_voice.ogg`, {
      type: 'audio/ogg',
      lastModified: Date.now(),
    });
  };

  // ⭐️ 1. Direct Messenger Share Action
  // Triggers native share sheet with the audio file.
  // On Android/iOS, selecting Messenger opens the native "Send to" conversation picker
  // where the user sees all their Messenger chats and sends the voice note directly!
  const handleDirectMessengerShare = async () => {
    setIsSharingMessenger(true);
    setShareNotice(null);

    try {
      const file = await getShareableFile('messenger');

      // Check if navigator.share can share this audio file
      if (typeof navigator !== 'undefined' && navigator.share) {
        let canShareFile = true;
        try {
          if (navigator.canShare) {
            canShareFile = navigator.canShare({ files: [file] });
          }
        } catch {
          canShareFile = true;
        }

        if (canShareFile) {
          // CRITICAL: Passing ONLY files: [file] (WITHOUT url or text) ensures
          // Messenger opens its chat picker as an audio message rather than a web link!
          await navigator.share({
            files: [file],
          });
          setShareNotice({ message: 'মেসেঞ্জার অ্যাপে শেয়ারের জন্য পাঠানো হয়েছে!' });
          setTimeout(() => setShareNotice(null), 4000);
          setIsSharingMessenger(false);
          return;
        }
      }

      // If navigator.share is not supported or blocked (e.g. inside an iframe)
      // Open the Messenger phone app directly via deep link, NOT web!
      await downloadAudioFile(currentDownloadUrl, messengerDownloadName);
      
      // Try opening Messenger app on phone
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = 'fb-messenger://';
        setShareNotice({
          message: 'ভয়েস ফাইল ডাউনলোড হয়েছে এবং ফোনের মেসেঞ্জার অ্যাপ খোলা হয়েছে। যে চ্যাটে পাঠাতে চান তাতে ফাইলটি পাঠিয়ে দিন।'
        });
      } else {
        setShareNotice({
          message: 'মেসেঞ্জার ভয়েস ফাইলটি ডাউনলোড হয়েছে। মেসেঞ্জার চ্যাটে ফাইলটি ড্রপ করলেই আসল ভয়েস হিসেবে যাবে।'
        });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setIsSharingMessenger(false);
        return; // User cancelled
      }
      console.warn('Messenger direct share error:', err);
      // Fallback: Open Messenger app on phone directly
      try {
        window.location.href = 'fb-messenger://';
      } catch {
        // ignore
      }
      setShareNotice({
        message: 'শেয়ার মেনু খুলতে ফোনের ক্রোম ব্রাউজারে সাইটটি ওপেন করুন অথবা মেসেঞ্জার অ্যাপ খুলুন।'
      });
    } finally {
      setIsSharingMessenger(false);
    }
  };

  // ⭐️ 2. Share to All Apps (WhatsApp, Telegram, etc.)
  const handleShareAllApps = async () => {
    setIsSharingAll(true);
    setShareNotice(null);

    try {
      const file = await getShareableFile('voice');

      if (typeof navigator !== 'undefined' && navigator.share) {
        let canShare = true;
        try {
          if (navigator.canShare) {
            canShare = navigator.canShare({ files: [file] });
          }
        } catch {
          canShare = true;
        }

        if (canShare) {
          await navigator.share({
            files: [file],
          });
          setIsSharingAll(false);
          return;
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setIsSharingAll(false);
        return;
      }
      console.warn('Share all error:', err);
    }

    setIsSharingAll(false);
    onOpenShareModal();
  };

  // ⭐️ 3. Download Formatted Audio
  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadSuccess(false);
    try {
      await downloadAudioFile(currentDownloadUrl, currentDownloadFileName);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-700/40 bg-[#062114]/90 p-4 sm:p-5 shadow-xl backdrop-blur-md">
      {/* Header with Title & Compression */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-emerald-800/40">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-lime-400 text-slate-950 font-bold shadow-md">
            <Check className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                ভয়েস রূপান্তর সফল হয়েছে
              </h3>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${formatBadgeTheme}`}>
                <Leaf className="h-3 w-3" />
                <span>{formatBadgeText}</span>
              </span>
            </div>
            <p className="text-xs text-emerald-300/70 font-mono truncate max-w-xs sm:max-w-md mt-0.5">
              {currentDownloadFileName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-emerald-950 border border-emerald-700/50 px-3 py-1 text-xs font-semibold text-emerald-300 self-start sm:self-auto">
          <ArrowDownRight className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-mono tabular-nums">{result.compressionRatio}% সাইজ সাশ্রয়</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <div className="rounded-xl border border-emerald-900/40 bg-[#04160e]/80 p-2.5 px-3">
          <span className="text-[10px] font-medium text-emerald-300/60 block">আসল আকার</span>
          <span className="font-mono text-xs sm:text-sm font-semibold text-emerald-100 tabular-nums">
            {formatBytes(result.originalSize)}
          </span>
        </div>

        <div className="rounded-xl border border-emerald-900/40 bg-[#04160e]/80 p-2.5 px-3">
          <span className="text-[10px] font-medium text-emerald-300/60 block">ভয়েস মেসেজ আকার</span>
          <span className="font-mono text-xs sm:text-sm font-semibold text-emerald-300 tabular-nums">
            {formatBytes(result.convertedSize)}
          </span>
        </div>

        <div className="rounded-xl border border-emerald-900/40 bg-[#04160e]/80 p-2.5 px-3">
          <span className="text-[10px] font-medium text-emerald-300/60 block">সময়কাল</span>
          <span className="font-mono text-xs sm:text-sm font-semibold text-white tabular-nums">
            {formatDuration(result.duration)}
          </span>
        </div>

        <div className="rounded-xl border border-emerald-900/40 bg-[#04160e]/80 p-2.5 px-3">
          <span className="text-[10px] font-medium text-emerald-300/60 block">কোডেক ও আউটপুট</span>
          <span className="font-mono text-xs sm:text-sm font-semibold text-cyan-300 tabular-nums">
            Opus ৪৮kHz মনো
          </span>
        </div>
      </div>

      {/* Dynamic Feedback Banner */}
      {shareNotice && (
        <div className={`mb-4 flex items-start gap-2 rounded-xl p-3 text-xs border ${
          shareNotice.isError
            ? 'bg-rose-950/50 border-rose-500/50 text-rose-300'
            : 'bg-blue-950/60 border-blue-400/50 text-blue-200'
        }`}>
          <Smartphone className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5" />
          <div className="flex-1">
            <p>{shareNotice.message}</p>
          </div>
          <button
            onClick={() => setShareNotice(null)}
            className="text-white/60 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ⭐️ ACTION BUTTONS SECTION ⭐️ */}
      <div className="space-y-3">
        {/* 1. PRIMARY DEDICATED MESSENGER SHARE BUTTON (OPENS CHATS DIRECTLY IN PHONE APP) */}
        <div className="rounded-2xl border-2 border-blue-500/60 bg-gradient-to-r from-[#0084FF]/25 via-[#072535] to-[#A824FB]/25 p-4 shadow-xl shadow-blue-950/50 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0084FF] to-[#A824FB] text-white shadow-md">
                <MessengerIcon className="h-4 w-4 text-white" />
              </span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <span>মেসেঞ্জারে সরাসরি পাঠান (সব চ্যাট খুলবে)</span>
                </h4>
                <p className="text-[10px] text-blue-200/90">
                  ওয়েব নয় — সরাসরি ফোনের মেসেঞ্জার অ্যাপে আপনার চ্যাট লিস্ট আসবে
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-cyan-300 bg-blue-900/60 border border-blue-400/40 px-2 py-0.5 rounded-full">
              Phone App Direct
            </span>
          </div>

          <button
            onClick={handleDirectMessengerShare}
            disabled={isSharingMessenger}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#0084FF] via-[#00B2FE] to-[#A824FB] hover:opacity-95 py-3.5 px-4 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-950/70 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
          >
            {isSharingMessenger ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>মেসেঞ্জারে চ্যাট লিস্ট লোড হচ্ছে...</span>
              </>
            ) : (
              <>
                <MessengerIcon className="h-4 w-4 text-white" />
                <span>মেসেঞ্জার অ্যাপে আসল ভয়েস পাঠান (চ্যাট নির্বাচন করুন)</span>
              </>
            )}
          </button>
        </div>

        {/* 2. SECONDARY ACTION ROW (ALL APPS, DOWNLOAD, TELEGRAM BOT) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Share to All Apps (Native Share Sheet) */}
          <button
            onClick={handleShareAllApps}
            disabled={isSharingAll}
            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/50 hover:bg-emerald-900/50 py-2.5 px-3 text-xs font-semibold text-emerald-200 hover:text-white transition-all cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {isSharingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
            ) : (
              <Share2 className="h-3.5 w-3.5 text-emerald-400" />
            )}
            <span>সব অ্যাপে শেয়ার (WhatsApp, ইত্যাদি)</span>
          </button>

          {/* Direct File Download */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center justify-center gap-2 rounded-xl border border-teal-600/40 bg-teal-950/40 hover:bg-teal-900/40 py-2.5 px-3 text-xs font-semibold text-teal-200 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          >
            {downloadSuccess ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400 stroke-[3]" />
                <span>ডাউনলোড সম্পন্ন!</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5 text-teal-400" />
                <span>ভয়েস ফাইল ডাউনলোড</span>
              </>
            )}
          </button>

          {/* Telegram Bot Send */}
          <button
            onClick={onOpenSendModal}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-purple-600/40 bg-purple-950/40 hover:bg-purple-900/40 py-2.5 px-3 text-xs font-semibold text-purple-200 hover:text-white transition-all cursor-pointer"
          >
            <Send className="h-3.5 w-3.5 text-purple-300" />
            <span>টেলিগ্রাম বটে পাঠান</span>
          </button>
        </div>

        {/* 3. FORMAT SWITCHER / RECONVERT (FORMATTING IS SEPARATE) */}
        {onReconvert && (
          <div className="pt-3 border-t border-emerald-900/50 mt-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-200/90 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span>অন্য অ্যাপের ফরম্যাটে নিন (ফরম্যাটিং আলাদা):</span>
              </span>
              <span className="text-[10px] text-cyan-300 font-mono">
                ১-ক্লিক রি-কনভার্ট
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Messenger Format */}
              <button
                onClick={() => onReconvert('messenger')}
                disabled={isReconverting || activeFormat === 'messenger'}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-semibold transition-all cursor-pointer ${
                  activeFormat === 'messenger'
                    ? 'bg-blue-600/30 border-2 border-blue-400 text-white shadow-sm ring-1 ring-blue-400/50'
                    : 'border border-blue-500/30 bg-blue-950/30 text-blue-200 hover:bg-blue-900/40 hover:text-white'
                } disabled:cursor-default`}
              >
                <MessengerIcon className="h-3.5 w-3.5 text-[#00C6FF]" />
                <span className="truncate">মেসেঞ্জার (.opus)</span>
                {activeFormat === 'messenger' && <Check className="h-3 w-3 text-cyan-300 shrink-0" />}
              </button>

              {/* Telegram Format */}
              <button
                onClick={() => onReconvert('telegram')}
                disabled={isReconverting || activeFormat === 'telegram'}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-semibold transition-all cursor-pointer ${
                  activeFormat === 'telegram'
                    ? 'bg-[#229ED9]/30 border-2 border-[#229ED9] text-white shadow-sm ring-1 ring-[#229ED9]/50'
                    : 'border border-cyan-500/30 bg-cyan-950/30 text-cyan-200 hover:bg-cyan-900/40 hover:text-white'
                } disabled:cursor-default`}
              >
                <TelegramIcon className="h-3.5 w-3.5 text-[#229ED9]" />
                <span className="truncate">টেলিগ্রাম (.ogg)</span>
                {activeFormat === 'telegram' && <Check className="h-3 w-3 text-cyan-300 shrink-0" />}
              </button>

              {/* WhatsApp Format */}
              <button
                onClick={() => onReconvert('whatsapp')}
                disabled={isReconverting || activeFormat === 'whatsapp'}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-semibold transition-all cursor-pointer ${
                  activeFormat === 'whatsapp'
                    ? 'bg-[#25D366]/30 border-2 border-[#25D366] text-white shadow-sm ring-1 ring-[#25D366]/50'
                    : 'border border-emerald-500/30 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-900/40 hover:text-white'
                } disabled:cursor-default`}
              >
                <WhatsAppIcon className="h-3.5 w-3.5 text-[#25D366]" />
                <span className="truncate">WhatsApp (.opus)</span>
                {activeFormat === 'whatsapp' && <Check className="h-3 w-3 text-emerald-300 shrink-0" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
