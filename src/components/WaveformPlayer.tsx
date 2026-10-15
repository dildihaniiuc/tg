import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, FastForward } from 'lucide-react';
import { formatDuration } from '../utils/audio';

interface WaveformPlayerProps {
  originalAudioUrl?: string | null;
  convertedAudioUrl?: string | null;
  peaks: number[]; // 100 5-bit peaks (0..31)
  originalName: string;
  duration: number;
  isConverted?: boolean;
}

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({
  originalAudioUrl,
  convertedAudioUrl,
  peaks,
  originalName,
  duration,
  isConverted = false,
}) => {
  const [activeTrack, setActiveTrack] = useState<'converted' | 'original'>(
    isConverted && convertedAudioUrl ? 'converted' : 'original'
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef(false);

  // Synchronize track source
  const currentAudioSrc =
    activeTrack === 'converted' && convertedAudioUrl
      ? convertedAudioUrl
      : originalAudioUrl || '';

  // Update active track when convertedAudioUrl becomes available
  useEffect(() => {
    if (convertedAudioUrl) {
      setActiveTrack('converted');
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [convertedAudioUrl]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [currentAudioSrc]);

  // Draw waveform on canvas
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const safePeaks = peaks && peaks.length > 0 ? peaks : Array(100).fill(10);
    const totalBars = safePeaks.length;
    const barSpacing = 1.8;
    const availableWidth = width - (totalBars - 1) * barSpacing;
    const barWidth = Math.max(2, availableWidth / totalBars);

    const activeDuration = duration > 0 ? duration : 1;
    const progress = Math.min(1, Math.max(0, currentTime / activeDuration));

    const minBarHeight = 4;
    const maxBarHeight = height - 12;

    for (let i = 0; i < totalBars; i++) {
      const peakVal = safePeaks[i];
      const barHeight = Math.max(
        minBarHeight,
        (peakVal / 31) * maxBarHeight
      );

      const x = i * (barWidth + barSpacing);
      const y = (height - barHeight) / 2;
      const barProgress = (i + 0.5) / totalBars;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [barWidth / 2]);

      if (barProgress <= progress) {
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#38bdf8'); // sky-400
        gradient.addColorStop(1, '#818cf8'); // indigo-400
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = '#334155'; // slate-700
      }
      ctx.fill();
    }

    // Draw playhead cursor
    const cursorX = progress * width;
    ctx.beginPath();
    ctx.strokeStyle = '#a855f7'; // purple-500
    ctx.lineWidth = 2;
    ctx.moveTo(cursorX, 2);
    ctx.lineTo(cursorX, height - 2);
    ctx.stroke();

    // Hover cursor indicator
    if (hoverPosition !== null) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(hoverPosition, 0);
      ctx.lineTo(hoverPosition, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [peaks, currentTime, duration, hoverPosition]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Handle play/pause
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !currentAudioSrc) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        console.warn('Playback error:', err);
      });
    }
  };

  // Scrubbing on waveform canvas
  const handleSeek = (clientX: number) => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio || duration <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const seekRatio = x / rect.width;
    const targetTime = seekRatio * duration;

    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    handleSeek(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    setHoverPosition(x);
    setHoverTime((x / rect.width) * duration);

    if (isDraggingRef.current) {
      handleSeek(e.clientX);
    }
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
    setHoverPosition(null);
    setHoverTime(null);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Speed multiplier cycle
  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextRateIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const newRate = rates[nextRateIndex];
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Reset to start
  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-white/[0.08] bg-[#121824] p-5 shadow-2xl backdrop-blur-sm">
      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={currentAudioSrc}
        preload="metadata"
        className="hidden"
      />

      {/* Header with Track Switcher and Metadata */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              ইন্টারঅ্যাক্টিভ ওয়েভফর্ম প্রিভিউ
            </span>
            <span className="text-slate-600">·</span>
            <span className="font-mono text-xs text-slate-400 tabular-nums">১০০ পিক (৫-বিট)</span>
          </div>
          <h4 className="mt-0.5 text-sm font-medium text-white truncate max-w-sm sm:max-w-md">
            {originalName}
          </h4>
        </div>

        {/* Source Switcher if both available */}
        {convertedAudioUrl && originalAudioUrl && (
          <div className="flex items-center rounded-lg bg-black/40 p-1 border border-white/[0.06]">
            <button
              onClick={() => {
                setActiveTrack('converted');
                setIsPlaying(false);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                activeTrack === 'converted'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              টেলিগ্রাম ভয়েস (.ogg)
            </button>
            <button
              onClick={() => {
                setActiveTrack('original');
                setIsPlaying(false);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                activeTrack === 'original'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              আসল অডিও
            </button>
          </div>
        )}
      </div>

      {/* Telegram Style Waveform Container */}
      <div className="relative group">
        <div className="relative h-24 w-full rounded-xl bg-[#0b0f17]/90 p-2 border border-white/[0.05] flex items-center">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            className="h-full w-full cursor-pointer touch-none"
          />

          {/* Time scrubber tooltip on hover */}
          {hoverTime !== null && hoverPosition !== null && (
            <div
              className="pointer-events-none absolute -top-7 rounded bg-slate-900 border border-white/20 px-1.5 py-0.5 text-[11px] font-mono text-cyan-300 shadow-md tabular-nums -translate-x-1/2"
              style={{ left: `${hoverPosition + 8}px` }}
            >
              {formatDuration(hoverTime)}
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-xs font-mono text-slate-400 tabular-nums">
          <span className="text-cyan-400 font-medium">{formatDuration(currentTime)}</span>
          <span className="text-slate-500">
            {activeTrack === 'converted' ? 'OGG / Opus · ৪৮ kHz মনো' : 'সোর্স অডিও'}
          </span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Telegram-style Control Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          {/* Main Play / Pause Button with glowing circular Telegram motif */}
          <button
            onClick={togglePlay}
            disabled={!currentAudioSrc}
            aria-label={isPlaying ? 'ভয়েস থামান' : 'ভয়েস চালান'}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 text-white shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-white" />
            ) : (
              <Play className="h-5 w-5 fill-white ml-0.5" />
            )}
          </button>

          {/* Restart */}
          <button
            onClick={handleRestart}
            aria-label="শুরু থেকে চালান"
            className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Volume / Mute */}
          <button
            onClick={toggleMute}
            aria-label={isMuted ? 'সাউন্ড চালু করুন' : 'সাউন্ড বন্ধ করুন'}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>

        {/* Telegram Speed Multiplier Pill */}
        <div className="flex items-center gap-2">
          <button
            onClick={cyclePlaybackRate}
            className="flex items-center gap-1 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-xs font-mono font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors tabular-nums cursor-pointer"
            title="প্লেব্যাক স্পিড পরিবর্তন করতে ক্লিক করুন"
          >
            <FastForward className="h-3.5 w-3.5 text-purple-400" />
            <span>{playbackRate}x</span>
          </button>

          {isConverted && (
            <span className="hidden sm:inline-flex items-center rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-[11px] font-medium text-emerald-400">
              খাঁটি টেলিগ্রাম ভয়েস
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
