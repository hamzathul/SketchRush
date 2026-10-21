'use client';

import { useEffect, useRef } from 'react';
import { useServerNow } from '@/lib/use-server-now';
import { sfx } from '@/lib/sound';

interface TimerRingProps {
  endsAt: number | null;
  totalMs: number;
  size?: number;
  showSeconds?: boolean;
  className?: string;
}

export function TimerRing({ endsAt, totalMs, size = 46, showSeconds = true, className = '' }: TimerRingProps) {
  const now = useServerNow(100);
  const lastTick = useRef(-1);

  const remaining = endsAt ? Math.max(0, endsAt - now) : 0;
  const fraction = endsAt && totalMs > 0 ? Math.min(1, remaining / totalMs) : 0;
  const seconds = Math.ceil(remaining / 1000);

  useEffect(() => {
    if (!endsAt) {
      lastTick.current = -1;
      return;
    }
    if (seconds > 0 && seconds <= 5 && seconds !== lastTick.current) {
      lastTick.current = seconds;
      sfx.tick();
    }
    if (seconds > 5) lastTick.current = -1;
  }, [seconds, endsAt]);

  const color = fraction <= 0.2 ? '#fb7185' : fraction <= 0.45 ? '#fbbf24' : '#b8f36b';
  const strokeWidth = 4;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - fraction);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      title={endsAt ? `${seconds}s remaining` : 'Timer'}
      aria-label={endsAt ? `${seconds} seconds remaining` : 'Timer'}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 120ms linear, stroke 300ms ease' }}
        />
      </svg>
      {showSeconds ? (
        <span
          className="absolute font-display text-xs font-bold tabular-nums"
          style={{ color: fraction <= 0.2 ? '#fb7185' : undefined }}
        >
          {endsAt ? seconds : '—'}
        </span>
      ) : null}
    </div>
  );
}
