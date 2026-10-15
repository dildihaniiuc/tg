import React from 'react';
import { ShieldCheck, Cpu, Radio, Sparkles, HelpCircle } from 'lucide-react';

export const TelegramExplanation: React.FC = () => {
  return (
    <section id="specs-section" className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            টেলিগ্রাম ভয়েস স্পেসিফিকেশন ও প্রযুক্তিগত নির্দেশিকা
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            কেন সাধারণ অডিও কনভার্টার কাজ করেনা এবং খাঁটি টেলিগ্রাম ভয়েসের জন্য কী কী আবশ্যক।
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 shrink-0">
          <ShieldCheck className="h-4 w-4" />
          <span>১০০% টেলিগ্রাম স্ট্যান্ডার্ড কমপ্লায়েন্ট</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: The OGG/Opus Standard */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#121824] p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-3">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">
              OGG + Opus কোডেক স্ট্যান্ডার্ড
            </h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              টেলিগ্রাম তার ভয়েস মেসেজের জন্য উন্মুক্ত <strong className="text-slate-200">Opus কোডেক</strong> এবং <strong className="text-slate-200">OGG কনটেইনার</strong> ব্যবহার করে। এটি মানুষের কথ্য ভাষার স্পষ্টতা অক্ষুণ্ণ রেখে ফাইলের সাইজ ৭০-৮০% পর্যন্ত ছোট করে দেয়। শুধু নাম পরিবর্তন করে .ogg বানালে কাজ হবেনা, প্রকৃত ট্রান্সকোডিং জরুরি।
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] font-mono text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>কনটেইনার:</span>
              <span className="text-cyan-300">OGG (.ogg)</span>
            </div>
            <div className="flex justify-between">
              <span>কোডেক:</span>
              <span className="text-cyan-300">libopus</span>
            </div>
            <div className="flex justify-between">
              <span>স্ট্যান্ডার্ড বিটরেট:</span>
              <span className="text-cyan-300">৩২ kbps</span>
            </div>
          </div>
        </div>

        {/* Card 2: 48 kHz Mono Requirement */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#121824] p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-3">
              <Radio className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">
              ৪৮ kHz ফ্রিকোয়েন্সি ও মনো (Mono) সাউন্ড
            </h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Opus এর অভ্যন্তরীণ আর্কিটেকচার ৪৮ kHz এ চলে। স্টেরিও বা ৪৪.১ kHz ফাইলে টেলিগ্রাম এটিকে ভয়েস না ভেবে গান মনে করতে পারে। টেলিভয়েস স্বয়ংক্রিয়ভাবে অডিওকে <strong className="text-slate-200">৪৮,০০০ Hz</strong> এবং একক চ্যানেল <strong className="text-slate-200">মনো (Mono)</strong> তে রূপান্তর করে।
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] font-mono text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>স্যাম্পলিং রেট:</span>
              <span className="text-cyan-300">৪৮,০০০ Hz</span>
            </div>
            <div className="flex justify-between">
              <span>চ্যানেল:</span>
              <span className="text-cyan-300">১ (Mono)</span>
            </div>
            <div className="flex justify-between">
              <span>প্রোফাইল:</span>
              <span className="text-cyan-300">VoIP (কথ্য অপ্টিমাইজড)</span>
            </div>
          </div>
        </div>

        {/* Card 3: 5-Bit Waveform Bit-Packing */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#121824] p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">
              ১০০-স্যাম্পল ৫-বিট ওয়েভফর্ম গণিত
            </h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              টেলিগ্রাম চ্যাটে ভয়েসের সাউন্ড পিক বা ঢেউ দেখানোর জন্য ৫-বিট অ্যারে ব্যবহার করে। ১০০টি স্লাইসের পিক ভ্যালুকে (০ থেকে ৩১) বিট-প্যাকিং করে ৬৩ বাইটের Base64 স্ট্রিং তৈরি করা হয়, যা টেলিগ্রাম ক্লায়েন্টকে আসল ওয়েভফর্ম আঁকতে সাহায্য করে।
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] font-mono text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>স্যাম্পল সংখ্যা:</span>
              <span className="text-cyan-300">১০০ টি স্লাইস</span>
            </div>
            <div className="flex justify-between">
              <span>রেঞ্জ:</span>
              <span className="text-cyan-300">৫-বিট (০ হতে ৩১)</span>
            </div>
            <div className="flex justify-between">
              <span>প্যাকিং:</span>
              <span className="text-cyan-300">৬৩ বাইট Base64</span>
            </div>
          </div>
        </div>
      </div>

      {/* Guide & Crucial Clarification Banner */}
      <div id="bot-guide-section" className="rounded-2xl border border-white/[0.08] bg-[#121824] p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white">
              জরুরি তথ্য: কীভাবে নিশ্চিত করবেন এটি টেলিগ্রামে পুরোপুরি ভয়েস বাবল হিসেবে দেখাবে?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              রূপান্তরিত <code className="text-cyan-300 font-mono">.ogg</code> ফাইলটি হলো শতভাগ সঠিক ভয়েস ফাইল। টেলিগ্রামে এটি পাঠানোর দুটি অত্যন্ত সহজ উপায় রয়েছে:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-blue-500/20 bg-blue-950/10 p-3.5 space-y-1.5">
                <div className="font-semibold text-cyan-200 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-cyan-300 text-[10px]">১</span>
                  <span>পদ্ধতি ১: "সরাসরি টেলিগ্রামে শেয়ার করুন" বাটন</span>
                </div>
                <p className="text-slate-400">
                  আপনার মোবাইল বা কম্পিউটারে সরাসরি শেয়ার বাটনে চাপলে সরাসরি আপনার অফিসিয়াল টেলিগ্রাম অ্যাপ ওপেন হবে। সেখান থেকে যেকোনো চ্যাট নির্বাচন করে পাঠালে তা সরাসরি চলে যাবে।
                </p>
              </div>

              <div className="rounded-xl border border-purple-500/20 bg-purple-950/10 p-3.5 space-y-1.5">
                <div className="font-semibold text-purple-200 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 text-[10px]">২</span>
                  <span>পদ্ধতি ২: "টেলিগ্রাম বটে পাঠান (sendVoice)"</span>
                </div>
                <p className="text-slate-400">
                  বট এপিআই-এর অফিশিয়াল <code className="text-cyan-300 font-mono">sendVoice</code> মেথড ব্যবহার করে। এটি যেকোনো চ্যানেল বা চ্যাটে তাৎক্ষণিকভাবে গোল ভয়েস বাবল এবং জীবন্ত ওয়েভফর্ম সহ ভয়েস নোট ডেলিভার করে!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
