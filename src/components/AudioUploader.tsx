import React, { useRef, useState } from 'react';
import { UploadCloud, FileAudio, Leaf, X, Music, CheckCircle2, Sprout } from 'lucide-react';
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
    name: 'কথোপকথন ও কণ্ঠ',
    path: '/samples/voice_note_sample.mp3',
    duration: '০:০৬',
    icon: '🌿',
  },
  {
    name: 'পডকাস্ট বার্তা',
    path: '/samples/podcast_clip_sample.mp3',
    duration: '০:০৮',
    icon: '🍃',
  },
  {
    name: 'কুইক মেমো নোট',
    path: '/samples/quick_memo_sample.mp3',
    duration: '০:০৪',
    icon: '🌾',
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
    if (!isConverting) setIsDragOver(true);
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
      validateAndSelect(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelect(e.target.files[0]);
    }
  };

  const validateAndSelect = (file: File) => {
    if (file.size > 28 * 1024 * 1024) {
      alert('ফাইলের আকার ২৮ মেগাবাইটের বেশি। অনুগ্রহ করে ছোট অডিও ফাইল নির্বাচন করুন।');
      return;
    }
    onFileSelected(file);
  };

  return (
    <div className="w-full">
      {!currentFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isConverting && fileInputRef.current?.click()}
          className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 sm:p-9 text-center transition-all cursor-pointer ${
            isDragOver
              ? 'border-emerald-400 bg-emerald-950/40 scale-[1.01]'
              : 'border-emerald-800/40 bg-[#051c11]/60 hover:border-emerald-500/50 hover:bg-[#072416]/80 backdrop-blur-md shadow-lg shadow-emerald-950/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg,.opus,.webm"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Nature Glowing Icon */}
          <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600/20 via-teal-500/15 to-lime-400/20 border border-emerald-500/30 text-emerald-300 mb-3 group-hover:scale-110 transition-transform shadow-inner">
            <UploadCloud className="h-6 w-6 text-emerald-400" />
          </div>

          <h3 className="text-base font-semibold text-emerald-50 tracking-tight">
            অডিও ফাইল এখানে টেনে আনুন বা ব্রাউজ করুন
          </h3>
          <p className="mt-1 text-xs text-emerald-300/70 max-w-sm">
            MP3, WAV, M4A, AAC বা যেকোনো অডিও সাপোর্ট করে (সর্বোচ্চ ২৮ MB)
          </p>

          <div className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-900/40 border border-emerald-700/40 px-3 py-1 text-xs font-medium text-emerald-300">
            <Leaf className="h-3.5 w-3.5 text-emerald-400" />
            <span>ফাইল নির্বাচন করতে ক্লিক করুন</span>
          </div>

          {/* Quick Test Nature Samples */}
          <div className="mt-6 pt-5 border-t border-emerald-900/40 w-full" onClick={(e) => e.stopPropagation()}>
            <span className="text-[11px] font-medium text-emerald-300/60 block mb-2.5 text-center">
              অথবা স্যাম্পল অডিও দিয়ে সাথে সাথে টেস্ট করুন:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {SAMPLE_FILES.map((sample) => (
                <button
                  key={sample.name}
                  type="button"
                  onClick={() => onSampleSelected(sample.path, sample.name)}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-800/40 bg-emerald-950/50 hover:bg-emerald-900/40 hover:border-emerald-600/50 px-3 py-1.5 text-xs text-emerald-200 hover:text-white transition-all cursor-pointer shadow-sm"
                >
                  <span className="text-sm">{sample.icon}</span>
                  <span>{sample.name}</span>
                  <span className="text-[10px] text-emerald-400/60 font-mono">({sample.duration})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Selected File Card in Nature Styling */
        <div className="rounded-2xl border border-emerald-700/40 bg-[#062114]/90 p-4 sm:p-5 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-800/30 border border-emerald-600/40 text-emerald-300">
                <FileAudio className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-emerald-50 truncate max-w-xs sm:max-w-md">
                    {sampleName || currentFile.name}
                  </h4>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-300/70 mt-0.5">
                  <span>{formatBytes(currentFile.size)}</span>
                  {duration > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-300 font-semibold">{formatDuration(duration)}</span>
                    </>
                  )}
                  {sampleName && (
                    <>
                      <span>·</span>
                      <span className="text-lime-400">টেস্ট স্যাম্পল</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClear}
              disabled={isConverting}
              className="flex items-center gap-1 rounded-lg border border-emerald-800/40 bg-emerald-950/40 hover:bg-rose-950/40 hover:border-rose-700/50 px-2.5 py-1.5 text-xs text-emerald-300/80 hover:text-rose-300 transition-colors cursor-pointer shrink-0"
              title="অন্য ফাইল বাছুন"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">পরিবর্তন করুন</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
