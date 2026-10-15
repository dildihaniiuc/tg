import React, { useRef, useState } from 'react';
import { UploadCloud, FileAudio, Sparkles, X, Volume2 } from 'lucide-react';
import { formatBytes, formatDuration } from '../utils/audio';

interface AudioUploaderProps {
  currentFile: File | null;
  sampleName: string | null;
  duration: number;
  onFileSelected: (file: File) => void;
  onSampleSelected: (samplePath: string, displayName: string) => void;
  onClear: () => void;
  isConverting: boolean;
}

const SAMPLE_FILES = [
  {
    name: 'ভয়েস নোট স্যাম্পল',
    desc: 'মিটিং আপডেটের কথ্য সুর',
    path: '/samples/voice_note_sample.mp3',
    duration: 6,
  },
  {
    name: 'পডকাস্ট অডিও স্যাম্পল',
    desc: 'সুন্দর সুর ও অ্যাকোস্টিক মেলোডি',
    path: '/samples/podcast_clip_sample.mp3',
    duration: 8,
  },
  {
    name: 'কুইক ভয়েস মেমো',
    desc: 'ছোট ৩.৫ সেকেন্ডের বার্তা',
    path: '/samples/quick_memo_sample.mp3',
    duration: 3.5,
  },
];

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  currentFile,
  sampleName,
  duration,
  onFileSelected,
  onSampleSelected,
  onClear,
  isConverting,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isConverting) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isConverting) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSelectFile(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const validateAndSelectFile = (file: File) => {
    // Check file size (100MB)
    if (file.size > 100 * 1024 * 1024) {
      alert('নির্বাচিত ফাইলের আকার ১০০ মেগাবাইট অতিক্রম করেছে। অনুগ্রহ করে একটি ছোট অডিও ফাইল নির্বাচন করুন।');
      return;
    }

    onFileSelected(file);
  };

  return (
    <div className="w-full">
      {/* Upload Dropzone */}
      {!currentFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isConverting && fileInputRef.current?.click()}
          className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition-all cursor-pointer ${
            isDragOver
              ? 'border-cyan-400 bg-cyan-950/20 shadow-lg shadow-cyan-500/10'
              : 'border-white/[0.12] bg-[#121824]/60 hover:border-purple-500/60 hover:bg-[#161f2e]/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.webm,.wma,.aiff"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isConverting}
          />

          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-500/20 via-indigo-500/20 to-cyan-500/20 border border-white/10 group-hover:scale-105 transition-transform duration-200">
            <UploadCloud className="h-7 w-7 text-cyan-400" />
          </div>

          <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
            এখানে আপনার অডিও ফাইল টেনে এনে ছেড়ে দিন অথবা{' '}
            <span className="text-cyan-400 underline decoration-cyan-400/40 underline-offset-4 group-hover:text-cyan-300">
              ফাইল সিলেক্ট করুন
            </span>
          </h3>

          <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-md">
            MP3, WAV, M4A, AAC, FLAC, WEBM এবং OGG ফাইল সমর্থিত (সর্বোচ্চ ১০০ মেগাবাইট)।
            খাঁটি টেলিগ্রাম-সামঞ্জস্যপূর্ণ OGG/Opus ফরম্যাটে রূপান্তরিত হবে।
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
            <span className="rounded-md bg-white/[0.05] px-2 py-1 text-slate-300 font-mono text-[11px]">MP3</span>
            <span className="rounded-md bg-white/[0.05] px-2 py-1 text-slate-300 font-mono text-[11px]">WAV</span>
            <span className="rounded-md bg-white/[0.05] px-2 py-1 text-slate-300 font-mono text-[11px]">M4A</span>
            <span className="rounded-md bg-white/[0.05] px-2 py-1 text-slate-300 font-mono text-[11px]">AAC</span>
            <span className="rounded-md bg-white/[0.05] px-2 py-1 text-slate-300 font-mono text-[11px]">FLAC</span>
            <span className="text-slate-500 font-normal">→ ৪৮kHz মনো OGG/Opus</span>
          </div>
        </div>
      ) : (
        /* Selected File Card */
        <div className="rounded-2xl border border-white/[0.1] bg-[#121824] p-5 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <FileAudio className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm sm:text-base font-semibold text-white truncate">
                    {currentFile.name}
                  </h4>
                  {sampleName && (
                    <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300 shrink-0">
                      স্যাম্পল
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-0.5 tabular-nums">
                  <span>{formatBytes(currentFile.size)}</span>
                  <span>·</span>
                  <span>{duration > 0 ? formatDuration(duration) : 'সময় গণনা হচ্ছে...'}</span>
                  <span>·</span>
                  <span className="uppercase text-slate-500">
                    {currentFile.name.split('.').pop() || 'AUDIO'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClear}
              disabled={isConverting}
              aria-label="অডিও মুছুন"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Test Samples */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#0f1420]/70 px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>অডিও ফাইল নেই? টেস্ট করতে তৈরি স্যাম্পল ব্যবহার করুন:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {SAMPLE_FILES.map((sample) => (
            <button
              key={sample.name}
              disabled={isConverting}
              onClick={() => onSampleSelected(sample.path, sample.name)}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs text-slate-300 hover:border-purple-500/40 hover:bg-purple-500/10 hover:text-white transition-all disabled:opacity-50"
            >
              <Volume2 className="h-3 w-3 text-cyan-400" />
              <span>{sample.name}</span>
              <span className="font-mono text-[10px] text-slate-400 tabular-nums">({sample.duration} সে.)</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
