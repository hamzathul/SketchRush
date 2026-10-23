'use client';

import { useEffect, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DrawingReplayProps {
  frames: string[];
  className?: string;
}

/**
 * A tiny flipbook built from local canvas snapshots. It plays once when the
 * round ends and can be replayed as many times as the room wants.
 */
export function DrawingReplay({ frames, className = '' }: DrawingReplayProps) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(frames.length > 1);

  useEffect(() => {
    if (frames.length > 1 && index === 0) setPlaying(true);
  }, [frames.length, index]);

  useEffect(() => {
    if (!playing) return;
    if (index >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setIndex((current) => current + 1), 180);
    return () => window.clearTimeout(timer);
  }, [playing, index, frames.length]);

  const restart = () => {
    if (frames.length === 0) return;
    setIndex(0);
    setPlaying(frames.length > 1);
  };

  return (
    <div className={cn('w-full', className)} data-testid="round-replay">
      <div className="mb-1.5 flex items-center justify-between px-0.5">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          <Play size={10} className="text-lime" /> Replay
        </p>
        <button
          type="button"
          onClick={restart}
          disabled={frames.length < 2}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted transition hover:bg-white/6 hover:text-ink disabled:opacity-40"
        >
          <RotateCcw size={10} /> Watch again
        </button>
      </div>

      <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-xl border border-white/10 bg-[#fbfbf7] shadow-[0_16px_36px_-24px_rgba(0,0,0,0.9)]">
        {frames.length > 0 ? (
          <img
            src={frames[index] ?? frames[frames.length - 1]}
            alt={`Drawing replay, frame ${Math.min(index + 1, frames.length)} of ${frames.length}`}
            className="block aspect-[4/3] w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 bg-[#fbfbf7] text-center">
            <span aria-hidden="true" className="text-xl">
              ✏️
            </span>
            <p className="text-[11px] font-medium text-[#596273]">Replay unavailable</p>
            <p className="text-[10px] text-[#8a93a3]">Too quick for the flipbook</p>
          </div>
        )}

        {frames.length > 1 ? (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10">
            <div
              className="h-full bg-lime transition-[width] duration-150"
              style={{ width: `${((index + 1) / frames.length) * 100}%` }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
