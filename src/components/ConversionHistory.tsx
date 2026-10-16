import React from 'react';
import { History, Download, Send, Play, Trash2, Share2, Leaf, MessageCircle } from 'lucide-react';
import { ConversionResult } from '../types';
import { formatBytes, formatDuration, downloadAudioFile } from '../utils/audio';

interface ConversionHistoryProps {
  history: ConversionResult[];
  activeId: string | null;
  onSelectResult: (result: ConversionResult) => void;
  onOpenSendModal: (result: ConversionResult) => void;
  onOpenShareModal: (result: ConversionResult) => void;
  onDeleteResult: (id: string) => void;
  onClearHistory: () => void;
}

export const ConversionHistory: React.FC<ConversionHistoryProps> = ({
  history,
  activeId,
  onSelectResult,
  onOpenSendModal,
  onOpenShareModal,
  onDeleteResult,
  onClearHistory,
}) => {
  if (history.length === 0) return null;

  const handleDownload = async (item: ConversionResult) => {
    const isMsg = item.targetFormat === 'messenger';
    const isWp = item.targetFormat === 'whatsapp' || item.downloadUrl.includes('.opus');
    const baseName = item.originalName.replace(/\.[^/.]+$/, '');
    const filename = isMsg
      ? `${baseName}_messenger_voice.opus`
      : isWp
      ? `${baseName}_whatsapp_voice.opus`
      : `${baseName}_voice.ogg`;
    await downloadAudioFile(item.downloadUrl, filename);
  };

  return (
    <section className="w-full rounded-2xl border border-emerald-800/40 bg-[#062114]/90 p-5 sm:p-6 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-emerald-900/40 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Leaf className="h-4 w-4 text-emerald-400" />
          <h3 className="text-base font-semibold text-emerald-100">বর্তমান সেশনের ভয়েস হিস্ট্রি</h3>
          <span className="font-mono text-xs text-emerald-300/70 tabular-nums">({history.length})</span>
        </div>

        <button
          onClick={onClearHistory}
          className="text-xs text-emerald-400/80 hover:text-rose-400 transition-colors cursor-pointer"
        >
          সব মুছুন
        </button>
      </div>

      <div className="divide-y divide-emerald-900/30">
        {history.map((item) => {
          const isActive = activeId === item.id;
          const isWp = item.targetFormat === 'whatsapp' || item.downloadUrl.includes('.opus');

          return (
            <div
              key={item.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-2 rounded-xl transition-colors ${
                isActive ? 'bg-emerald-950/60 border border-emerald-500/40' : 'hover:bg-emerald-900/20'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => onSelectResult(item)}
                  title="ওয়েভফর্মে শুনুন"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-950 border border-emerald-700/50 hover:bg-emerald-600 text-emerald-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Play className="h-4 w-4 ml-0.5" />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-medium text-emerald-50 truncate max-w-xs sm:max-w-md">
                      {item.originalName}
                    </h4>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-cyan-300 border border-emerald-800">
                      {item.targetFormat === 'messenger' ? 'Messenger (.opus)' : isWp ? 'WhatsApp (.opus)' : 'Telegram (.ogg)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-300/60 mt-0.5 tabular-nums">
                    <span>{formatDuration(item.duration)}</span>
                    <span>·</span>
                    <span className="text-emerald-300">{formatBytes(item.convertedSize)}</span>
                    <span className="text-emerald-400/60">
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
                  className="flex items-center gap-1 rounded-lg border border-emerald-800/40 bg-emerald-950/40 px-2.5 py-1.5 text-xs text-emerald-200 hover:bg-emerald-900/50 hover:text-white transition-colors cursor-pointer"
                  title="ভয়েস ফাইল ডাউনলোড করুন"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">ডাউনলোড</span>
                </button>

                <button
                  onClick={() => onOpenShareModal(item)}
                  className="flex items-center gap-1 rounded-lg border border-emerald-700/50 bg-emerald-900/30 px-2.5 py-1.5 text-xs text-emerald-300 hover:bg-emerald-700 hover:text-white transition-colors cursor-pointer"
                  title="শেয়ার অপশন"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">শেয়ার</span>
                </button>

                <button
                  onClick={() => onOpenSendModal(item)}
                  className="flex items-center gap-1 rounded-lg bg-emerald-950 border border-emerald-700/40 px-2.5 py-1.5 text-xs text-emerald-300 hover:bg-emerald-800 hover:text-white transition-colors cursor-pointer"
                  title="টেলিগ্রাম বটে পাঠান"
                >
                  <Send className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">বট</span>
                </button>

                <button
                  onClick={() => onDeleteResult(item.id)}
                  className="p-1.5 rounded-lg text-emerald-400/50 hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
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
