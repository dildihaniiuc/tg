import React from 'react';
import { Sliders, Volume2, Mic, Info, Check } from 'lucide-react';
import { ConversionSettings } from '../types';

interface ConversionSettingsPanelProps {
  settings: ConversionSettings;
  onChange: (settings: ConversionSettings) => void;
  disabled?: boolean;
}

const BITRATE_OPTIONS: Array<{
  value: ConversionSettings['bitrate'];
  label: string;
  tag: string;
  description: string;
}> = [
  {
    value: '32k',
    label: '৩২ kbps',
    tag: 'স্ট্যান্ডার্ড টেলিগ্রাম ভয়েস',
    description: 'টেলিগ্রামের অফিসিয়াল ভয়েস স্ট্যান্ডার্ড। সর্বোচ্চ স্পষ্টতা এবং সর্বনিম্ন সাইজ।',
  },
  {
    value: '24k',
    label: '২৪ kbps',
    tag: 'আল্ট্রা-কমপ্যাক্ট ভয়েস',
    description: 'দীর্ঘ রেকর্ডিং, লেকচার ও ধীরগতির ইন্টারনেটের জন্য সেরা।',
  },
  {
    value: '48k',
    label: '৪৮ kbps',
    tag: 'উচ্চমানের ভয়েস',
    description: 'পডকাস্ট ক্লিপ ও স্পষ্ট কথ্য অডিওর জন্য উপযুক্ত।',
  },
  {
    value: '64k',
    label: '৬৪ kbps',
    tag: 'স্টুডিও কোয়ালিটি',
    description: 'ব্যাকগ্রাউন্ড সুর বা মিউজিক সহ সর্বোচ্চ স্পষ্টতার জন্য।',
  },
];

export const ConversionSettingsPanel: React.FC<ConversionSettingsPanelProps> = ({
  settings,
  onChange,
  disabled = false,
}) => {
  const handleBitrateSelect = (bitrate: ConversionSettings['bitrate']) => {
    onChange({ ...settings, bitrate });
  };

  const handleOpusAppSelect = (opusApplication: ConversionSettings['opusApplication']) => {
    onChange({ ...settings, opusApplication });
  };

  const handleNormalizeToggle = () => {
    onChange({ ...settings, normalize: !settings.normalize });
  };

  const handleSpeechBoostToggle = () => {
    onChange({ ...settings, speechBoost: !settings.speechBoost });
  };

  return (
    <div className="w-full rounded-2xl border border-white/[0.08] bg-[#121824] p-5 shadow-xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">ট্রান্সকোডার সেটিংস</h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>৪৮ kHz</span>
          <span>·</span>
          <span>মনো (১ চ্যানেল)</span>
          <span>·</span>
          <span className="text-cyan-400">Opus</span>
        </div>
      </div>

      {/* Bitrate Selector */}
      <div>
        <label className="text-xs font-medium text-slate-300 block mb-2">
          অপাস অডিও বিটরেট (Opus Bitrate)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {BITRATE_OPTIONS.map((opt) => {
            const isSelected = settings.bitrate === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => handleBitrateSelect(opt.value)}
                className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-cyan-500/80 bg-cyan-950/20 shadow-sm shadow-cyan-500/10'
                    : 'border-white/[0.06] bg-[#0f1420]/60 hover:border-white/20 hover:bg-[#161f2e]'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-white tabular-nums">
                    {opt.label}
                  </span>
                  {isSelected && (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[#0b0f17]">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <span className={`text-[11px] font-medium mt-1 ${isSelected ? 'text-cyan-300' : 'text-purple-300'}`}>
                  {opt.tag}
                </span>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Toggles */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-white/[0.06] pt-4">
        {/* Opus Tuning Profile */}
        <div className="flex flex-col justify-between rounded-xl border border-white/[0.06] bg-[#0f1420]/60 p-3">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-cyan-400 shrink-0" />
            <span className="text-xs font-medium text-white">অপাস প্রোফাইল</span>
          </div>
          <div className="mt-2.5 flex items-center rounded-lg bg-black/30 p-1 border border-white/[0.06]">
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleOpusAppSelect('voip')}
              className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-all ${
                settings.opusApplication === 'voip'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ভিওআইপি / কথ্য
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleOpusAppSelect('audio')}
              className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-all ${
                settings.opusApplication === 'audio'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ফুল অডিও
            </button>
          </div>
        </div>

        {/* Loudness Normalization */}
        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0f1420]/60 p-3">
          <div className="pr-2">
            <div className="flex items-center gap-1.5">
              <Volume2 className="h-4 w-4 text-purple-400 shrink-0" />
              <span className="text-xs font-medium text-white">লাউডনেস সমতা</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              EBU R128 (-১৬ LUFS কথ্য টার্গেট)
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.normalize}
            disabled={disabled}
            onClick={handleNormalizeToggle}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-purple-500 ${
              settings.normalize ? 'bg-cyan-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.normalize ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Speech Clarity Boost */}
        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0f1420]/60 p-3">
          <div className="pr-2">
            <div className="flex items-center gap-1.5">
              <Mic className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-medium text-white">স্পষ্টতা বৃদ্ধি</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              হাই-পাস ১০০Hz + ২.৫kHz EQ
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.speechBoost}
            disabled={disabled}
            onClick={handleSpeechBoostToggle}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-purple-500 ${
              settings.speechBoost ? 'bg-cyan-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.speechBoost ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mandatory Telegram Spec Notice */}
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-purple-950/20 border border-purple-500/20 px-3.5 py-2.5 text-xs text-slate-300">
        <Info className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-purple-300">টেলিগ্রাম ভয়েস স্পেসিফিকেশন:</strong> অডিও স্বয়ংক্রিয়ভাবে{' '}
          <span className="font-mono text-cyan-300">৪৮,০০০ Hz</span> এবং{' '}
          <span className="font-mono text-cyan-300">মনো (১ চ্যানেল)</span> ফরম্যাটে রূপান্তর হবে। এটি নিশ্চিত করে যে টেলিগ্রাম অ্যাপ এটিকে ১০০% খাঁটি ভয়েস মেসেজ হিসেবে শনাক্ত করে।
        </p>
      </div>
    </div>
  );
};
