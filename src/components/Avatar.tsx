import type { CSSProperties } from 'react';
import { AVATAR_EMOJIS } from '@/lib/game-config';
import { cn } from '@/lib/cn';

const PALETTES: Array<[string, string, string]> = [
  ['#8b5cf6', '#22d3ee', '#0f172a'],
  ['#f472b6', '#8b5cf6', '#170e1f'],
  ['#22d3ee', '#34d399', '#071a1a'],
  ['#f59e0b', '#ef4444', '#1b1006'],
  ['#a3e635', '#14b8a6', '#0b1505'],
  ['#60a5fa', '#c084fc', '#0a1020'],
  ['#fb7185', '#fbbf24', '#1c0b0f'],
  ['#34d399', '#a3e635', '#06130d'],
  ['#fb923c', '#f43f5e', '#1a0b08'],
  ['#2dd4bf', '#38bdf8', '#041418'],
  ['#e879f9', '#818cf8', '#160b20'],
  ['#facc15', '#84cc16', '#141004'],
  ['#f87171', '#fbbf24', '#1c0a0a'],
  ['#4ade80', '#0ea5e9', '#04140f'],
  ['#c084fc', '#f472b6', '#150a1c'],
  ['#38bdf8', '#a3e635', '#061018'],
  ['#fda4af', '#c084fc', '#1c0a14'],
  ['#5eead4', '#8b5cf6', '#041416'],
  ['#fdba74', '#a3e635', '#1a1206'],
  ['#93c5fd', '#f0abfc', '#0a0f1e'],
];

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function isKnownEmoji(value: string): boolean {
  return (AVATAR_EMOJIS as readonly string[]).includes(value);
}

/** Seeds are picker emojis, optionally with a `-suffix` that varies the palette. */
export function avatarEmoji(seed: string): string {
  const base = (seed || '').split('-')[0];
  if (isKnownEmoji(base)) return base;
  return AVATAR_EMOJIS[hashSeed(seed || 'sketchrush') % AVATAR_EMOJIS.length];
}

export function randomAvatarSeed(): string {
  const base = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

interface AvatarProps {
  seed: string;
  name?: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function Avatar({ seed, name = '', size = 40, className = '', style }: AvatarProps) {
  const source = seed || name || 'sketchrush';
  const hash = hashSeed(source);
  const [from, to, shade] = PALETTES[hash % PALETTES.length];
  const emoji = avatarEmoji(source);
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  const badge = Math.max(13, Math.round(size * 0.44));
  const ring = Math.max(1, Math.round(size * 0.04));

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-xl',
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundImage: `radial-gradient(120% 120% at 20% 12%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 46%), linear-gradient(135deg, ${from} 0%, ${to} 68%, ${shade} 132%)`,
        ...style,
      }}
      role="img"
      aria-label={name ? `${name}'s avatar` : 'Player avatar'}
    >
      <span
        aria-hidden="true"
        className="leading-none"
        style={{
          fontSize: Math.round(size * 0.54),
          transform: `translate(${-size * 0.06}px, ${-size * 0.08}px)`,
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))',
        }}
      >
        {emoji}
      </span>
      <span
        aria-hidden="true"
        className="absolute bottom-0 right-0 flex items-center justify-center rounded-full font-bold leading-none text-white"
        style={{
          width: badge,
          height: badge,
          fontSize: Math.round(badge * 0.56),
          background: 'rgba(9, 12, 20, 0.92)',
          boxShadow: `0 0 0 ${ring}px rgba(255,255,255,0.32)`,
        }}
      >
        {initial}
      </span>
    </span>
  );
}
