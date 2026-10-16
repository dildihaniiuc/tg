import React, { useState } from 'react';
import { Sliders, ChevronDown, ChevronUp, Check, Leaf } from 'lucide-react';
import { ConversionSettings } from '../types';

interface ConversionSettingsPanelProps {
  settings: ConversionSettings;
  onChange: (settings: ConversionSettings) => void;
  disabled?: boolean;
}

const BITRATE_PRESETS: Array<{
  value: ConversionSettings['bitrate'];
  label: string;
  desc: string;
}> = [
  { value: '32k', label: '৩২ kbps (স্ট্যান্ডার্ড)', desc: 'টেলিগ্রাম ও হোয়াটসঅ্যাপের জন্য সেরা স্পষ্টতা' },
  { value: '24k', label: '২৪ kbps (কম্প্যাক্ট)', desc: 'দীর্ঘ রেকর্ডিং ও সর্বনিম্ন ফাইলের সাইজ' },
  { value: '48k', label: '৪৮ kbps (এইচডি)', desc: 'উচ্চমানের পডকাস্ট বা পরিষ্কার কথ্য অডিও' },
  { value: '64k', label: '৬৪ kbps (স্টুডিও)', desc: 'মিউজিক বা ব্যাকগ্রাউন্ড সাউন্ড সহ' },
];

export const ConversionSettingsPanel: React.FC<ConversionSettingsPanelProps> = ({
  settings,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full rounded-2xl border border-emerald-800/40 bg-[#062114]/80 backdrop-blur-md overflow-hidden transition-all shadow-md">
      {/* Header / Toggle */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 px-4 text-xs hover:bg-emerald-900/20 transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-2 text-emerald-200">
          <Sliders className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-semibold text-emerald-100">উন্নত অডিও সেটিংস</span>
          <span className="text-emerald-700">·</span>
          <span className="text-emerald-300 font-mono text-[11px]">
            {settings.targetFormat === 'whatsapp'
              ? 'WhatsApp (.opus)'
              : settings.targetFormat === 'messenger'
              ? 'Messenger (.opus)'
              : 'Telegram (.ogg)'} · {settings.bitrate}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-emerald-400">
          <span className="text-[11px]">{isOpen ? 'লুকান' : 'কাস্টমাইজ'}</span>
          {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>

      {/* Expandable Panel */}
      {isOpen && (
        <div className="p-4 pt-2 border-t border-emerald-900/40 bg-[#04160e]/90 space-y-3.5">
          {/* Format preference */}
          <div>
            <label className="text-[11px] font-medium text-emerald-300/80 block mb-2">
              ডিফল্ট ভয়েস ফরম্যাট:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...settings, targetFormat: 'whatsapp' })}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.targetFormat === 'whatsapp'
                    ? 'border-emerald-500 bg-emerald-900/40 text-white shadow-sm'
                    : 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300/70 hover:text-emerald-100'
                }`}
              >
                <div>
                  <span className="text-xs font-semibold block text-[#25D366]">WhatsApp (.opus)</span>
                  <span className="text-[10px] text-emerald-400/70 block mt-0.5">হোয়াটসঅ্যাপ PTT বাবল</span>
                </div>
                {settings.targetFormat === 'whatsapp' && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 ml-1" />}
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...settings, targetFormat: 'messenger' })}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.targetFormat === 'messenger'
                    ? 'border-[#0084FF] bg-blue-950/50 text-white shadow-sm ring-1 ring-[#0084FF]/40'
                    : 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300/70 hover:text-emerald-100'
                }`}
              >
                <div>
                  <span className="text-xs font-semibold block text-[#00C6FF]">Messenger (.opus)</span>
                  <span className="text-[10px] text-emerald-400/70 block mt-0.5">মেসেঞ্জার অডিও বাবল</span>
                </div>
                {settings.targetFormat === 'messenger' && <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0 ml-1" />}
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...settings, targetFormat: 'telegram' })}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.targetFormat === 'telegram'
                    ? 'border-[#229ED9] bg-cyan-950/40 text-white shadow-sm ring-1 ring-[#229ED9]/40'
                    : 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300/70 hover:text-emerald-100'
                }`}
              >
                <div>
                  <span className="text-xs font-semibold block text-[#229ED9]">Telegram (.ogg)</span>
                  <span className="text-[10px] text-emerald-400/70 block mt-0.5">টেলিগ্রাম ওয়েভফর্ম বাবল</span>
                </div>
                {settings.targetFormat === 'telegram' && <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0 ml-1" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-emerald-300/80 block mb-2">
              ভয়েস কোয়ালিটি ও বিটরেট:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BITRATE_PRESETS.map((preset) => {
                const isSelected = settings.bitrate === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ ...settings, bitrate: preset.value })}
                    className={`flex items-start justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500/70 bg-emerald-900/40 text-white'
                        : 'border-emerald-900/50 bg-emerald-950/20 text-emerald-300/70 hover:text-emerald-200 hover:border-emerald-700/50'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-semibold block">{preset.label}</span>
                      <span className="text-[10px] text-emerald-400/60 block mt-0.5">{preset.desc}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-emerald-300/80">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.normalize}
                disabled={disabled}
                onChange={(e) => onChange({ ...settings, normalize: e.target.checked })}
                className="rounded border-emerald-700 bg-emerald-950 text-emerald-500 focus:ring-0 cursor-pointer"
              />
              <span>লাউডনেস স্বাভাবিক করুন (Normalize)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.speechBoost}
                disabled={disabled}
                onChange={(e) => onChange({ ...settings, speechBoost: e.target.checked })}
                className="rounded border-emerald-700 bg-emerald-950 text-emerald-500 focus:ring-0 cursor-pointer"
              />
              <span>কথ্য কণ্ঠ বুস্ট (Speech Clarity)</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
