import React from 'react';
import { Leaf, Send, Sparkles, Droplets } from 'lucide-react';

interface HeaderProps {
  onOpenBotModal: () => void;
  activeConversionCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ onOpenBotModal }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-emerald-900/40 bg-[#04150c]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Brand / Logo with Botanical Nature Touch */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2.5 text-base sm:text-lg font-bold tracking-tight text-white hover:opacity-95 transition-opacity"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-lime-400 p-0.5 shadow-md shadow-emerald-950/60">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#051c11]">
              <Leaf className="h-5 w-5 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight bg-gradient-to-r from-emerald-200 via-teal-100 to-lime-200 bg-clip-text text-transparent text-lg">
                VoiceGram
              </span>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 px-1.5 py-0.2 rounded-md">
                Nature
              </span>
            </div>
            <span className="text-[11px] font-medium text-emerald-400/80 -mt-0.5">
              ভয়েসগ্রাম · প্রকৃতির ছোঁয়ায় কণ্ঠস্বর
            </span>
          </div>
        </a>

        {/* Right Action */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-300/80">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span>WhatsApp ও Telegram ভয়েস মোড</span>
          </div>

          <button
            onClick={onOpenBotModal}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-700/40 bg-emerald-900/30 hover:bg-emerald-800/40 px-3.5 py-1.5 text-xs font-semibold text-emerald-200 hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <Send className="h-3.5 w-3.5 text-emerald-400" />
            <span>টেলিগ্রাম বট</span>
          </button>
        </div>
      </div>
    </header>
  );
};
