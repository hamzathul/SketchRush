'use client';

import { useGameStore } from '@/lib/store';

function position(key: string): number {
  let hash = 0;
  for (let index = 0; index < key.length; index++) {
    hash = (hash * 31 + key.charCodeAt(index)) | 0;
  }
  return 8 + (Math.abs(hash) % 78);
}

export function ReactionLayer() {
  const reactions = useGameStore((store) => store.reactions);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
      {reactions.map((reaction) => (
        <span
          key={reaction.key}
          data-testid="reaction-bubble"
          className="absolute -ml-12 flex w-24 animate-reaction flex-col items-center gap-1"
          style={{ left: `${position(reaction.key)}%`, bottom: '8%' }}
          title={`${reaction.nickname} reacted ${reaction.emoji}`}
        >
          <span className="text-2xl drop-shadow-lg sm:text-3xl">{reaction.emoji}</span>
          <span className="max-w-full truncate rounded-full border border-white/15 bg-night/85 px-2 py-0.5 text-[10px] font-semibold text-ink shadow-lg backdrop-blur-sm">
            {reaction.nickname}
          </span>
        </span>
      ))}
    </div>
  );
}
