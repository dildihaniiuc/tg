import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Radio,
  MessageSquare,
  Sparkles,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ConversionResult, TelegramBotInfo, TelegramSendState } from '../types';
import { downloadAudioFile, safeJsonFetch } from '../utils/audio';

interface TelegramBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ConversionResult | null;
}

export const TelegramBotModal: React.FC<TelegramBotModalProps> = ({
  isOpen,
  onClose,
  result,
}) => {
  const [botToken, setBotToken] = useState(() => localStorage.getItem('televoice_bot_token') || '');
  const [chatId, setChatId] = useState(() => localStorage.getItem('televoice_chat_id') || '');
  const [caption, setCaption] = useState('');
  const [showToken, setShowToken] = useState(false);

  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedBot, setVerifiedBot] = useState<TelegramBotInfo | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [sendState, setSendState] = useState<TelegramSendState>({
    isSending: false,
    success: false,
  });

  const [showGuide, setShowGuide] = useState(false);

  // Save token and chat ID to local storage when changed
  useEffect(() => {
    if (botToken) localStorage.setItem('televoice_bot_token', botToken);
  }, [botToken]);

  useEffect(() => {
    if (chatId) localStorage.setItem('televoice_chat_id', chatId);
  }, [chatId]);

  if (!isOpen) return null;

  const handleTestBot = async () => {
    if (!botToken.trim()) {
      setVerifyError('অনুগ্রহ করে প্রথমে আপনার বট টোকেন লিখুন।');
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);
    setVerifiedBot(null);

    try {
      const data = await safeJsonFetch<any>(
        '/api/telegram/test-bot',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botToken: botToken.trim() }),
        },
        'বট টোকেন যাচাই করা যায়নি।'
      );

      if (data.ok) {
        setVerifiedBot(data.bot);
      } else {
        setVerifyError(data.error || 'বট টোকেন যাচাই করা যায়নি।');
      }
    } catch (err: any) {
      setVerifyError(err.message || 'টেলিগ্রাম সার্ভারে সংযোগ ব্যর্থ হয়েছে।');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSendVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result) {
      setSendState({
        isSending: false,
        success: false,
        error: 'ভয়েস পাঠানোর পূর্বে দয়া করে একটি অডিও কনভার্ট করুন।',
      });
      return;
    }

    if (!botToken.trim() || !chatId.trim()) {
      setSendState({
        isSending: false,
        success: false,
        error: 'বট টোকেন এবং গন্তব্য চ্যাট আইডি উভয়ই আবশ্যক।',
      });
      return;
    }

    setSendState({ isSending: true, success: false });

    try {
      const data = await safeJsonFetch<any>(
        '/api/telegram/send',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            botToken: botToken.trim(),
            chatId: chatId.trim(),
            caption: caption.trim(),
            audioId: result.id,
            customWaveform: result.telegramWaveformBase64,
          }),
        },
        'টেলিগ্রামে ভয়েস মেসেজ পাঠানো সম্ভব হয়নি।'
      );

      if (data.ok) {
        setSendState({
          isSending: false,
          success: true,
          messageId: data.messageId,
          chatTitle: data.chat?.title,
          chatUsername: data.chat?.username,
          lastSentAt: Date.now(),
        });

        // Trigger celebratory confetti
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#a855f7', '#6366f1'],
        });
      } else {
        setSendState({
          isSending: false,
          success: false,
          error: data.error || 'টেলিগ্রামে ভয়েস মেসেজ পাঠানো সম্ভব হয়নি।',
        });
      }
    } catch (err: any) {
      setSendState({
        isSending: false,
        success: false,
        error: err.message || 'টেলিগ্রাম সার্ভারের সাথে যোগাযোগে সমস্যা হয়েছে।',
      });
    }
  };

  const handleDirectShareAlternative = async () => {
    if (!result) return;
    const targetName = `${result.originalName.replace(/\.[^/.]+$/, '')}_voice.ogg`;
    try {
      const res = await fetch(`${result.downloadUrl}?download=1`);
      const blob = await res.blob();
      const file = new File([blob], targetName, { type: 'audio/ogg' });
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch (e) {
      // Fallback
    }
    await downloadAudioFile(result.downloadUrl, targetName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl border border-emerald-700/50 bg-[#062114] p-6 shadow-2xl text-emerald-50">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-900/40 hover:text-white transition-colors cursor-pointer"
          aria-label="বন্ধ করুন"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-2.5 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-lime-400 text-slate-950 shadow-md">
            <Send className="h-4 w-4 text-slate-950" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            টেলিগ্রাম ভয়েস মেসেজ পাঠান
          </h2>
        </div>
        <p className="text-xs text-emerald-300/70 mb-4">
          টেলিগ্রামের অফিশিয়াল <code className="text-emerald-300 font-mono">sendVoice</code> এপিআই ব্যবহার করে গোল ভয়েস বাবল ও ওয়েভফর্ম সহ সরাসরি পাঠান।
        </p>

        {/* Direct Telegram Share Quick Shortcut */}
        <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-700/40 bg-emerald-950/40 p-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-200">
            <Share2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>বট ছাড়া সরাসরি আপনার ফোনে টেলিগ্রামে শেয়ার করতে চান?</span>
          </div>
          <button
            type="button"
            onClick={handleDirectShareAlternative}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-500 transition-colors shrink-0 cursor-pointer shadow-sm"
          >
            সরাসরি শেয়ার
          </button>
        </div>

        {/* Telegram Compatibility Disclosure */}
        <div className="mb-5 rounded-xl border border-purple-500/20 bg-purple-950/20 p-3.5 text-xs text-slate-300">
          <div className="flex items-start gap-2">
            <HelpCircle className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-purple-200">
                কেন sendVoice পদ্ধতি বিশেষ?
              </p>
              <p className="mt-1 text-slate-300 leading-relaxed">
                সাধারণ অডিও ফাইল হিসেবে টেলিগ্রামে পাঠালে তা কেবল একটি অডিও প্লেয়ার হিসেবে দেখায়। কিন্তু বটের <code className="text-cyan-300 font-mono">sendVoice</code> এর মাধ্যমে পাঠালে টেলিগ্রাম ক্লায়েন্ট এটিকে শতভাগ খাঁটি গোল ভয়েস বাবল এবং ৫-বিট ওয়েভফর্ম সহ উপস্থাপন করে!
              </p>
            </div>
          </div>
        </div>

        {/* Success State View */}
        {sendState.success ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">ভয়েস মেসেজ সফলভাবে পৌঁছেছে!</h3>
            <p className="mt-1 text-xs text-slate-300">
              টেলিগ্রাম বট এপিআই এর মাধ্যমে আসল ওয়েভফর্ম সহ সফলভাবে ডেলিভার করা হয়েছে।
            </p>
            {sendState.chatTitle && (
              <p className="mt-2 text-xs font-mono text-cyan-300">
                গন্তব্য: {sendState.chatTitle} {sendState.chatUsername ? `(@${sendState.chatUsername})` : ''}
              </p>
            )}

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setSendState({ isSending: false, success: false })}
                className="rounded-lg bg-white/10 px-4 py-2 text-xs font-medium text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                আরেকটি পাঠান
              </button>
              <button
                onClick={onClose}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors cursor-pointer"
              >
                সম্পন্ন
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendVoice} className="space-y-4">
            {/* Bot Token Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-cyan-400" />
                  <span>টেলিগ্রাম বট টোকেন (Bot Token)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2 flex items-center gap-1 cursor-pointer"
                >
                  <span>টোকেন প্রয়োজন?</span>
                </button>
              </div>

              <div className="relative flex items-center">
                <input
                  type={showToken ? 'text' : 'password'}
                  required
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  value={botToken}
                  onChange={(e) => {
                    setBotToken(e.target.value);
                    setVerifiedBot(null);
                    setVerifyError(null);
                  }}
                  className="w-full rounded-xl border border-white/[0.1] bg-[#0b0f17] px-3.5 py-2.5 pr-24 text-xs font-mono text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />

                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    aria-label={showToken ? 'টোকেন লুকান' : 'টোকেন দেখুন'}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>

                  <button
                    type="button"
                    disabled={isVerifying || !botToken.trim()}
                    onClick={handleTestBot}
                    className="rounded-md bg-white/[0.08] px-2 py-1 text-[10px] font-medium text-slate-300 hover:bg-white/[0.15] hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    {isVerifying ? 'যাচাই হচ্ছে...' : 'যাচাই করুন'}
                  </button>
                </div>
              </div>

              {/* Bot Verification Status */}
              {verifiedBot && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>ভেরিফায়েড বট: <strong>{verifiedBot.first_name}</strong> (@{verifiedBot.username})</span>
                </div>
              )}

              {verifyError && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{verifyError}</span>
                </div>
              )}

              <p className="mt-1 text-[11px] text-slate-500">
                নিরাপত্তা নিশ্চয়তা: বট টোকেন কোনো সার্ভারে সংরক্ষিত হয় না। এটি শুধুমাত্র অনুরোধকালে সরাসরি টেলিগ্রামে পাঠানো হয়।
              </p>
            </div>

            {/* Quick Bot Setup Helper Guide Accordion */}
            {showGuide && (
              <div className="rounded-xl border border-white/[0.08] bg-[#0b0f17]/80 p-3.5 text-xs text-slate-300 space-y-2">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>কীভাবে ৩০ সেকেন্ডে টেলিগ্রাম বট টোকেন পাবেন:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>টেলিগ্রামে <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">@BotFather</a> এর কাছে যান</li>
                  <li><code className="text-purple-300 font-mono">/newbot</code> পাঠিয়ে বটের নাম ও ইউজারনেম ঠিক করুন</li>
                  <li>BotFather যে HTTP API টোকেন দেবে তা কপি করে ওপরের ঘরে পেস্ট করুন</li>
                  <li>বটের লিংকে ক্লিক করে <code className="text-purple-300 font-mono">Start</code> বাটনে চাপুন যাতে বট আপনাকে মেসেজ পাঠাতে পারে</li>
                </ol>
              </div>
            )}

            {/* Chat ID Field */}
            <div>
              <label className="text-xs font-semibold text-slate-200 block mb-1.5">
                গন্তব্য চ্যাট আইডি বা চ্যানেল ইউজারনেম
              </label>
              <input
                type="text"
                required
                placeholder="@mychannel, 123456789, অথবা -1001234567890"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                className="w-full rounded-xl border border-white/[0.1] bg-[#0b0f17] px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                আপনার ব্যক্তিগত নিউমেরিক আইডি (জানতে <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">@userinfobot</a> দেখুন), পাবলিক চ্যানেল (<code className="text-slate-400">@channel</code>) বা গ্রুপ আইডি।
              </p>
            </div>

            {/* Caption Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <MessageSquare className="h-3 w-3 text-purple-400" />
                  <span>ভয়েস ক্যাপশন (ঐচ্ছিক)</span>
                </label>
                <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                  {caption.length}/1024
                </span>
              </div>
              <input
                type="text"
                maxLength={1024}
                placeholder="ভয়েসের সাথে কোনো টেক্সট বার্তা যোগ করতে পারেন..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full rounded-xl border border-white/[0.1] bg-[#0b0f17] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Send Error Notice */}
            {sendState.error && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-950/30 border border-rose-500/30 p-3 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{sendState.error}</span>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={sendState.isSending || !result}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-600/20 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {sendState.isSending ? (
                  <>
                    <Radio className="h-3.5 w-3.5 animate-pulse text-cyan-300" />
                    <span>ভয়েস মেসেজ পাঠানো হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 text-cyan-300" />
                    <span>ভয়েস মেসেজ এখনই পাঠান</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
