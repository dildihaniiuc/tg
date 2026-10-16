import React, { useEffect, useState } from 'react';
import { Loader2, Leaf, CheckCircle2 } from 'lucide-react';

interface ConversionProgressProps {
  fileName: string;
  targetFormat?: 'whatsapp' | 'messenger' | 'telegram';
}

const STEPS = [
  'অডিও স্ট্রিম ও হেডার বিশ্লেষণ করা হচ্ছে',
  'একক চ্যানেল মনোতে (Mono) রূপান্তর হচ্ছে',
  'উচ্চমানের libopus দিয়ে Opus কোডেকে এনকোড করা হচ্ছে',
  '১০০-স্লাইস সাউন্ড পিক থেকে ভয়েস ওয়েভফর্ম তৈরি হচ্ছে',
  'WhatsApp, Messenger ও Telegram অপ্টিমাইজড ভয়েস ফাইলে রূপান্তর সম্পন্ন হচ্ছে'
];

export const ConversionProgress: React.FC<ConversionProgressProps> = ({ fileName, targetFormat = 'whatsapp' }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 400);

    return () => clearInterval(interval);
  }, []);

  const getFormatTitle = () => {
    if (targetFormat === 'whatsapp') return 'হোয়াটসঅ্যাপ ভয়েস মেসেজে রূপান্তর হচ্ছে...';
    if (targetFormat === 'messenger') return 'মেসেঞ্জার ভয়েস মেসেজে রূপান্তর হচ্ছে...';
    return 'টেলিগ্রাম ভয়েস মেসেজে রূপান্তর হচ্ছে...';
  };

  return (
    <div className="w-full rounded-2xl border border-emerald-600/40 bg-[#062114]/95 p-6 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800/40 border border-emerald-500/40 text-emerald-300">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-emerald-50 flex items-center gap-2">
            <span>{getFormatTitle()}</span>
            <Leaf className="h-4 w-4 text-emerald-400 animate-pulse" />
          </h3>
          <p className="text-xs text-emerald-300/70 font-mono truncate max-w-sm sm:max-w-md">
            {fileName}
          </p>
        </div>
      </div>

      {/* Nature Progress Track */}
      <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-[#04160e]">
        <div
          className="h-full bg-gradient-to-r from-emerald-600 via-teal-400 to-lime-300 transition-all duration-300 ease-out shadow-[0_0_12px_#34d399]"
          style={{ width: `${Math.round(((currentStepIndex + 1) / STEPS.length) * 100)}%` }}
        />
      </div>

      {/* Step Sequence */}
      <div className="mt-4 space-y-2">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          return (
            <div
              key={step}
              className={`flex items-center gap-2.5 text-xs transition-opacity ${
                isDone
                  ? 'text-emerald-300 font-medium'
                  : isCurrent
                  ? 'text-emerald-100 font-semibold'
                  : 'text-emerald-600/40'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-300 shrink-0" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-800 shrink-0 mx-1" />
              )}
              <span>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
