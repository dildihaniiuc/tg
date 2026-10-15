import React from 'react';
import { History, Download, Send, Play, Trash2, ArrowDownRight, Share2 } from 'lucide-react';
import { ConversionResult } from '../types';
import { formatBytes, formatDuration, downloadAudioFile, shareAudioToTelegram } from '../utils/audio';

interface ConversionHistoryProps {
  history: ConversionResult[];
  activeId: string | null;
  onSelectResult: (result: ConversionResult) => void;
  onOpenSendModal: (result: ConversionResult) => void;
  onDeleteResult: (id: string) => void;
  onClearHistory: () => void;
}

export const ConversionHistory: React.FC<ConversionHistoryProps> = ({
  history,
  activeId,
  onSelectResult,
  onOpenSendModal,
  onDeleteResult,
  onClearHistory,
}) => {
  if (history.length === 0) return null;

  const handleDownload = async (item: ConversionResult) => {
    const targetName = `${item.originalName.replace(/\.[^/.]+$/, '')}_voice.ogg`;
    await downloadAudioFile(item.downloadUrl, targetName);
  };

  const handleShare = async (item: ConversionResult) => {
    const targetName = `${item.originalName.replace(/\.[^/.]+$/, '')}_voice.ogg`;
    await shareAudioToTelegram(item.downloadUrl, targetName);
  };

  return (
    <section className="w-full rounded-2xl border border-white/[0.08] bg-[#121824] p-5 sm:p-6 shadow-xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-purple-400" />
          <h3 className="text-base font-semibold text-white">বর্তমান সেশনের ইতিহাস</h3>
          <span className="font-mono text-xs text-slate-400 tabular-nums">({history.length})</span>
        </div>

        <button
          onClick={onClearHistory}
          className="text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
        >
          সব মুছুন
        </button>
      </div>

      <div className="divide-y divide-white/[0.05]">
        {history.map((item) => {
          const isActive = activeId === item.id;
          return (
            <div
              key={item.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-2 rounded-xl transition-colors ${
                isActive ? 'bg-purple-950/20 border border-purple-500/20' : 'hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => onSelectResult(item)}
                  title="ওয়েভফর্মে শুনুন"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] hover:bg-purple-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Play className="h-4 w-4 ml-0.5" />
                </button>

                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-medium text-white truncate max-w-xs sm:max-w-md">
                    {item.originalName}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-0.5 tabular-nums">
                    <span>{formatDuration(item.duration)}</span>
                    <span>·</span>
                    <span className="text-cyan-300">{formatBytes(item.convertedSize)}</span>
                    <span className="text-slate-500">
                      ({item.compressionRatio > 0 ? `-${item.compressionRatio}%` : 'রূপান্তরিত'})
                    </span>
                    <span>·</span>
                    <span>{item.bitrate} Opus</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => handleDownload(item)}
                  className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
                  title="ভয়েস ফাইল ডাউনলোড করুন"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">ডাউনলোড</span>
                </button>

                <button
                  onClick={() => handleShare(item)}
                  className="flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-xs text-cyan-300 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                  title="সরাসরি টেলিগ্রামে শেয়ার করুন"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">শেয়ার</span>
                </button>

                <button
                  onClick={() => onOpenSendModal(item)}
                  className="flex items-center gap-1 rounded-lg bg-purple-600/30 border border-purple-500/30 px-2.5 py-1.5 text-xs text-purple-200 hover:bg-purple-600 hover:text-white transition-colors cursor-pointer"
                  title="বট দিয়ে পাঠান"
                >
                  <Send className="h-3.5 w-3.5 text-cyan-300" />
                  <span className="hidden sm:inline">বট</span>
                </button>

                <button
                  onClick={() => onDeleteResult(item.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/[0.05] transition-colors cursor-pointer"
                  title="ইতিহাস থেকে মুছুন"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
