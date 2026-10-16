import React, { useState } from 'react';
import {
  X,
  Share2,
  Send,
  ExternalLink,
  Download,
  AlertCircle,
  Loader2,
  Leaf,
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
  Smartphone
} from 'lucide-react';
import { ConversionResult } from '../types';
import { downloadAudioFile } from '../utils/audio';

// Authentic Messenger SVG Icon with Lightning Bolt
export const MessengerIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.51 3.14 7.37.16.15.26.37.26.6v2.33c0 .54.58.91 1.07.67l2.6-1.28c.18-.09.39-.11.58-.06.74.2 1.53.31 2.35.31 5.64 0 10-4.13 10-9.64C22 6.13 17.64 2 12 2zm1.2 12.87l-2.67-2.85-5.21 2.85 5.73-6.09 2.74 2.85 5.14-2.85-5.73 6.09z" />
  </svg>
);

// Authentic WhatsApp SVG Icon
export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm0 18.09c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a7.994 7.994 0 01-1.23-4.32c0-4.41 3.59-8 8.02-8 2.14 0 4.16.83 5.67 2.35 1.52 1.52 2.35 3.53 2.35 5.68 0 4.41-3.59 8.03-8.02 8.03zm4.39-6.01c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.44-1.34-1.68-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z"/>
  </svg>
);

// Authentic Telegram SVG Icon
export const TelegramIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
  </svg>
);

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ConversionResult | null;
  onOpenBotModal: () => void;
  cachedVoiceFile?: File | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  result,
  onOpenBotModal,
  cachedVoiceFile,
}) => {
  const [isSharingSystem, setIsSharingSystem] = useState(false);
  const [isSharingMessenger, setIsSharingMessenger] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccessNotice, setShareSuccessNotice] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !result) return null;

  const currentFormat = result.targetFormat || 'messenger';
  const baseName = result.originalName.replace(/\.[^/.]+$/, '');

  let currentFileName = `${baseName}_messenger_voice.opus`;
  let currentDownloadUrl = result.messengerDownloadUrl || `/api/audio/${result.id}.opus?app=messenger`;
  let formatTitle = 'মেসেঞ্জার ভয়েস (.opus)';
  let formatBadgeColor = 'text-blue-300 border-blue-400/40 bg-blue-950/60';

  if (currentFormat === 'telegram') {
    currentFileName = `${baseName}_voice.ogg`;
    currentDownloadUrl = result.telegramDownloadUrl || `/api/audio/${result.id}.ogg`;
    formatTitle = 'টেলিগ্রাম ভয়েস (.ogg)';
    formatBadgeColor = 'text-cyan-300 border-cyan-400/40 bg-cyan-950/60';
  } else if (currentFormat === 'whatsapp') {
    currentFileName = `${baseName}_whatsapp_voice.opus`;
    currentDownloadUrl = result.whatsappDownloadUrl || `/api/audio/${result.id}.opus`;
    formatTitle = 'WhatsApp ভয়েস (.opus)';
    formatBadgeColor = 'text-emerald-300 border-emerald-400/40 bg-emerald-950/60';
  }

  // Get File object with universal audio/ogg container for seamless mobile sharing
  const getAudioFile = async (appName = 'voice'): Promise<File> => {
    if (cachedVoiceFile && cachedVoiceFile.type === 'audio/ogg') {
      return cachedVoiceFile;
    }

    const res = await fetch(`${currentDownloadUrl}?download=1`);
    if (!res.ok) throw new Error('অডিও ফাইল সার্ভার থেকে লোড করা যায়নি');
    const blob = await res.blob();

    return new File([blob], `${baseName}_${appName}_voice.ogg`, {
      type: 'audio/ogg',
      lastModified: Date.now(),
    });
  };

  // Dedicated Messenger Phone App Share
  const handleMessengerShare = async () => {
    setIsSharingMessenger(true);
    setShareError(null);
    setShareSuccessNotice(null);

    try {
      const file = await getAudioFile('messenger');

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
          setShareSuccessNotice('মেসেঞ্জার অ্যাপে পাঠানো হয়েছে!');
          setTimeout(() => setShareSuccessNotice(null), 4000);
          setIsSharingMessenger(false);
          return;
        }
      }

      // Fallback: Open phone Messenger app directly, NOT web
      await downloadAudioFile(currentDownloadUrl, currentFileName);
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = 'fb-messenger://';
        setShareSuccessNotice('ভয়েস ফাইল ডাউনলোড হয়েছে এবং মেসেঞ্জার অ্যাপ খোলা হয়েছে।');
      } else {
        setShareSuccessNotice('মেসেঞ্জার ভয়েস ফাইলটি ডাউনলোড হয়েছে।');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Messenger share error:', err);
        try {
          window.location.href = 'fb-messenger://';
        } catch {
          // ignore
        }
      }
    } finally {
      setIsSharingMessenger(false);
    }
  };

  // 1-Click System Share: Brings up ALL installed apps
  const handleSystemShare = async () => {
    setIsSharingSystem(true);
    setShareError(null);
    setShareSuccessNotice(null);

    try {
      const file = await getAudioFile('voice');

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
          setShareSuccessNotice('শেয়ার সম্পন্ন হয়েছে!');
          setTimeout(() => setShareSuccessNotice(null), 4000);
          setIsSharingSystem(false);
          return;
        }
      }

      await downloadAudioFile(currentDownloadUrl, currentFileName);
      setShareSuccessNotice('ভয়েস ফাইল ডাউনলোড হয়েছে।');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Share error:', err);
        setShareError(err.message || 'শেয়ার প্রক্রিয়াকরণে সমস্যা হয়েছে।');
      }
    } finally {
      setIsSharingSystem(false);
    }
  };

  // Direct download handler
  const handleDirectDownload = async () => {
    setIsDownloading(true);
    setShareError(null);
    try {
      await downloadAudioFile(currentDownloadUrl, currentFileName);
      setShareSuccessNotice('ফাইলটি সফলভাবে ডাউনলোড হয়েছে!');
      setTimeout(() => setShareSuccessNotice(null), 3000);
    } catch (err: any) {
      setShareError('ডাউনলোড করতে সমস্যা হয়েছে।');
    } finally {
      setIsDownloading(false);
    }
  };

  // Copy streaming URL
  const handleCopyLink = async () => {
    try {
      const fullUrl = `${window.location.origin}${currentDownloadUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setShareError('লিঙ্ক কপি করা যায়নি।');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-emerald-700/50 bg-[#062114] p-5 sm:p-6 shadow-2xl text-emerald-50 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-900/40 hover:text-white transition-colors cursor-pointer"
          aria-label="বন্ধ করুন"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 text-slate-950 shadow-md">
            <Share2 className="h-6 w-6 text-slate-950" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>সব অ্যাপে শেয়ার করুন</span>
              <Leaf className="h-4 w-4 text-emerald-400" />
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${formatBadgeColor}`}>
                {formatTitle}
              </span>
              <span className="text-xs text-emerald-300/70 truncate max-w-[200px]">
                {currentFileName}
              </span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {shareError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-rose-950/40 border border-rose-500/40 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{shareError}</span>
          </div>
        )}

        {shareSuccessNotice && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{shareSuccessNotice}</span>
          </div>
        )}

        {/* ⭐️ 1. PRIMARY DEDICATED MESSENGER PHONE APP ACTION ⭐️ */}
        <div className="mb-4 rounded-2xl border-2 border-blue-500/60 bg-gradient-to-r from-blue-950/80 via-[#072535] to-purple-950/70 p-4 shadow-xl shadow-blue-950/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0084FF] to-[#A824FB] text-white shadow-md">
                <MessengerIcon className="h-4 w-4 text-white" />
              </span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <span>মেসেঞ্জার অ্যাপে সরাসরি পাঠান (চ্যাট লিস্ট)</span>
                </h4>
                <p className="text-[10px] text-blue-200/90">
                  ওয়েব নয় — সরাসরি ফোনের মেসেঞ্জার অ্যাপে আপনার সব চ্যাট আসবে
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-cyan-300 bg-blue-900/60 border border-blue-400/40 px-2 py-0.5 rounded-full">
              Messenger App
            </span>
          </div>

          <button
            onClick={handleMessengerShare}
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
                <span>মেসেঞ্জার অ্যাপে ভয়েস পাঠান (চ্যাট নির্বাচন করুন)</span>
              </>
            )}
          </button>
        </div>

        {/* ⭐️ 2. SYSTEM SHARE SHEET (ALL APPS AT ONCE) ⭐️ */}
        <div className="mb-4 rounded-2xl border border-emerald-500/50 bg-gradient-to-r from-emerald-950/80 via-[#072d1b] to-teal-950/70 p-4 shadow-xl shadow-emerald-950/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>সরাসরি শেয়ার শিট (WhatsApp, Telegram সহ সব অ্যাপ)</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#25D366]/20 text-[#25D366]">
                <WhatsAppIcon className="h-3 w-3" />
              </span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#229ED9]/20 text-[#229ED9]">
                <TelegramIcon className="h-3 w-3" />
              </span>
            </div>
          </div>

          <button
            onClick={handleSystemShare}
            disabled={isSharingSystem}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 hover:opacity-95 py-3 px-4 text-xs sm:text-sm font-bold text-slate-950 shadow-md active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
          >
            {isSharingSystem ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                <span>শেয়ার শিট প্রস্তুত করা হচ্ছে...</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 text-slate-950 stroke-[2.5]" />
                <span>ফোনের সিস্টেম শেয়ার মেনু খুলুন</span>
              </>
            )}
          </button>
        </div>

        {/* 3. DIRECT DOWNLOAD ACTION */}
        <div className="mb-4 rounded-xl border border-emerald-800/40 bg-[#04160e]/90 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <span>ভয়েস ফাইল সরাসরি ডাউনলোড</span>
              </h4>
              <p className="text-[11px] text-emerald-300/70">
                {currentFileName}
              </p>
            </div>
            <button
              onClick={handleDirectDownload}
              disabled={isDownloading}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/60 hover:bg-emerald-900/60 px-3 py-2 text-xs font-semibold text-emerald-200 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
              ) : (
                <Download className="h-3.5 w-3.5 text-emerald-400" />
              )}
              <span>ডাউনলোড</span>
            </button>
          </div>
        </div>

        {/* 4. OTHER ACTIONS (TELEGRAM BOT & COPY LINK) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-emerald-900/50">
          <button
            onClick={() => {
              onClose();
              onOpenBotModal();
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-purple-500/40 bg-purple-950/40 hover:bg-purple-900/40 py-2.5 px-3 text-xs font-semibold text-purple-200 hover:text-white transition-all cursor-pointer"
          >
            <Send className="h-3.5 w-3.5 text-purple-400" />
            <span>টেলিগ্রাম বট দিয়ে পাঠান</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-800/40 bg-[#04160e] hover:bg-emerald-950/50 py-2.5 px-3 text-xs font-semibold text-emerald-300 hover:text-white transition-all cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>লিঙ্ক কপি হয়েছে!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-emerald-400" />
                <span>অডিও লিঙ্ক কপি করুন</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
