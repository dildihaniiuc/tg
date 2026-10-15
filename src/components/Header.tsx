import React from 'react';
import { Send, Radio } from 'lucide-react';

interface HeaderProps {
  onOpenBotModal: () => void;
  onScrollToSection: (sectionId: string) => void;
  activeConversionCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenBotModal,
  onScrollToSection,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#0b0f17]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3 sm:px-6">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 via-indigo-500 to-cyan-500 p-0.5 shadow-md shadow-purple-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-[#0b0f17]">
              <Radio className="h-4 w-4 text-cyan-400" />
            </div>
          </div>
          <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            টেলিভয়েস কনভার্টার
          </span>
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => onScrollToSection('converter-section')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            অডিও রূপান্তর
          </button>
          <button
            onClick={() => onScrollToSection('waveform-preview-section')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            ওয়েভফর্ম প্রিভিউ
          </button>
          <button
            onClick={() => onScrollToSection('specs-section')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            টেলিগ্রাম স্পেক্স
          </button>
          <button
            onClick={() => onScrollToSection('bot-guide-section')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            ভয়েস গাইড
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenBotModal}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-purple-500 hover:to-indigo-500 focus-visible:outline-2 focus-visible:outline-purple-500 transition-all whitespace-nowrap shrink-0"
          >
            <Send className="h-3.5 w-3.5 text-cyan-300" />
            <span>টেলিগ্রাম বটে পাঠান</span>
          </button>
        </div>
      </div>
    </header>
  );
};
