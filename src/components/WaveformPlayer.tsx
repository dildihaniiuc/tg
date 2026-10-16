import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, FastForward, Leaf } from 'lucide-react';
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

  // Draw waveform on canvas with organic nature emerald aesthetics
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
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(x, y, barWidth, barHeight, [barWidth / 2]);
      } else {
        ctx.rect(x, y, barWidth, barHeight);
      }

      if (barProgress <= progress) {
        // Nature vibrant leaf/sprout gradient
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#a7f3d0'); // mint / dewdrop
        gradient.addColorStop(0.5, '#34d399'); // emerald-400
        gradient.addColorStop(1, '#059669'); // emerald-600
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = '#0f3825'; // deep pine forest unplayed bar
      }
      ctx.fill();
    }

    // Draw playhead cursor in glowing emerald
    const cursorX = progress * width;
    ctx.beginPath();
    ctx.arc(cursorX, height / 2, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#34d399';
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }, [peaks, currentTime, duration]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Handle resizing
  useEffect(() => {
    const handleResize = () => drawWaveform();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawWaveform]);

  // Audio Play / Pause
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        console.error('Audio playback error:', err);
      });
    }
  };

  // Seek on click or scrub
  const handleSeek = (clientX: number) => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio || duration <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const seekPercentage = clickX / rect.width;
    const targetTime = seekPercentage * duration;

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

  const isOpusFile = currentAudioSrc.includes('.opus');

  return (
    <div className="w-full rounded-2xl border border-emerald-800/40 bg-[#062114]/90 p-5 shadow-2xl backdrop-blur-md">
      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={currentAudioSrc}
        preload="metadata"
        className="hidden"
      />

      {/* Header with Track Switcher and Metadata */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-900/40 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider text-emerald-400 flex items-center gap-1">
              <Leaf className="h-3 w-3" />
              <span>ওয়েভফর্ম প্রিভিউ</span>
            </span>
            <span className="text-emerald-800">·</span>
            <span className="font-mono text-xs text-emerald-300/70 tabular-nums">১০০ পিক (৫-বিট)</span>
          </div>
          <h4 className="mt-0.5 text-sm font-medium text-emerald-50 truncate max-w-sm sm:max-w-md">
            {originalName}
          </h4>
        </div>

        {/* Source Switcher if both available */}
        {convertedAudioUrl && originalAudioUrl && (
          <div className="flex items-center rounded-lg bg-[#04150c] p-1 border border-emerald-900/50">
            <button
              onClick={() => {
                setActiveTrack('converted');
                setIsPlaying(false);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                activeTrack === 'converted'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-300/70 hover:text-white'
              }`}
            >
              {currentAudioSrc.includes('app=messenger')
                ? 'মেসেঞ্জার ভয়েস (.opus)'
                : isOpusFile
                ? 'WhatsApp ভয়েস (.opus)'
                : 'টেলিগ্রাম ভয়েস (.ogg)'}
            </button>
            <button
              onClick={() => {
                setActiveTrack('original');
                setIsPlaying(false);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                activeTrack === 'original'
                  ? 'bg-emerald-950/60 text-emerald-200 shadow-sm border border-emerald-800/50'
                  : 'text-emerald-300/70 hover:text-white'
              }`}
            >
              আসল অডিও
            </button>
          </div>
        )}
      </div>

      {/* Waveform Container */}
      <div className="relative group">
        <div className="relative h-24 w-full rounded-xl bg-[#04160e] p-2 border border-emerald-900/40 flex items-center shadow-inner">
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
              className="pointer-events-none absolute -top-7 rounded bg-emerald-950 border border-emerald-600/40 px-1.5 py-0.5 text-[11px] font-mono text-emerald-300 shadow-md tabular-nums -translate-x-1/2"
              style={{ left: `${hoverPosition + 8}px` }}
            >
              {formatDuration(hoverTime)}
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-xs font-mono text-emerald-300/70 tabular-nums">
          <span className="text-emerald-400 font-medium">{formatDuration(currentTime)}</span>
          <span className="text-emerald-500/80">
            {activeTrack === 'converted'
              ? (isOpusFile ? 'Opus · WhatsApp ভয়েস বাবল' : 'OGG / Opus · Telegram ভয়েস')
              : 'সোর্স অডিও'}
          </span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          {/* Main Play / Pause Button in Nature Emerald Gradient */}
          <button
            onClick={togglePlay}
            disabled={!currentAudioSrc}
            aria-label={isPlaying ? 'ভয়েস থামান' : 'ভয়েস চালান'}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-lime-400 text-white shadow-lg shadow-emerald-950/50 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
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
            className="rounded-lg p-2 text-emerald-300/70 hover:bg-emerald-900/30 hover:text-white transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Volume / Mute */}
          <button
            onClick={toggleMute}
            aria-label={isMuted ? 'সাউন্ড চালু করুন' : 'সাউন্ড বন্ধ করুন'}
            className="rounded-lg p-2 text-emerald-300/70 hover:bg-emerald-900/30 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>

        {/* Speed Multiplier */}
        <div className="flex items-center gap-2">
          <button
            onClick={cyclePlaybackRate}
            className="flex items-center gap-1 rounded-lg border border-emerald-800/40 bg-emerald-950/40 px-2.5 py-1.5 text-xs font-mono font-medium text-emerald-200 hover:bg-emerald-900/40 hover:text-white transition-colors tabular-nums cursor-pointer"
            title="প্লেব্যাক স্পিড পরিবর্তন করতে ক্লিক করুন"
          >
            <FastForward className="h-3.5 w-3.5 text-emerald-400" />
            <span>{playbackRate}x</span>
          </button>

          {isConverted && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-emerald-950/80 border border-emerald-600/40 px-2 py-1 text-[11px] font-medium text-emerald-300">
              <Leaf className="h-3 w-3 text-emerald-400" />
              <span>{isOpusFile ? 'WhatsApp ভয়েস প্রস্তুত' : 'Telegram ভয়েস প্রস্তুত'}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
