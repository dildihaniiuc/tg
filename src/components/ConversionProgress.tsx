import React, { useEffect, useState } from 'react';
import { Loader2, Radio, CheckCircle2 } from 'lucide-react';

interface ConversionProgressProps {
  fileName: string;
}

const STEPS = [
  'অডিও স্ট্রিম ও ফাইল হেডার বিশ্লেষণ করা হচ্ছে',
  'একক চ্যানেল মনোতে (Mono) রূপান্তর হচ্ছে',
  '৪৮,০০০ Hz স্যাম্পল রেটে রিস্যাম্পল করা হচ্ছে',
  'উচ্চমানের libopus দিয়ে Opus কোডেকে এনকোড করা হচ্ছে',
  '১০০-স্লাইস সাউন্ড পিক থেকে ৫-বিট ওয়েভফর্ম তৈরি হচ্ছে',
  'টেলিগ্রাম-সামঞ্জস্যপূর্ণ OGG ভয়েস ফাইলে প্যাকেজিং হচ্ছে'
];

export const ConversionProgress: React.FC<ConversionProgressProps> = ({ fileName }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 450);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full rounded-2xl border border-purple-500/30 bg-[#121824] p-6 shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">
            টেলিগ্রাম ভয়েস মেসেজে রূপান্তর হচ্ছে...
          </h3>
          <p className="text-xs text-slate-400 font-mono truncate max-w-sm sm:max-w-md">
            {fileName}
          </p>
        </div>
      </div>

      {/* Progress Track */}
      <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 transition-all duration-300 ease-out"
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
                  ? 'text-emerald-400'
                  : isCurrent
                  ? 'text-cyan-300 font-medium'
                  : 'text-slate-600'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              ) : isCurrent ? (
                <Radio className="h-3.5 w-3.5 shrink-0 text-cyan-400 animate-pulse" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border border-slate-700 shrink-0" />
              )}
              <span>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
