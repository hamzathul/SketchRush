'use client';

import { REACTION_EMOJIS } from '@/lib/game-config';
import { getSocket } from '@/lib/socket';
import { cn } from '@/lib/cn';

export function ReactionRow({ className = '', size = 'sm' }: { className?: string; size?: 'sm' | 'md' }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-0.5', className)}>
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className={cn(
            'shrink-0 rounded-lg transition hover:bg-white/10 active:scale-90',
            size === 'sm' ? 'p-1 text-sm' : 'p-1 text-base',
          )}
          aria-label={`React with ${emoji}`}
          title={`React with ${emoji}`}
          onClick={() => getSocket().emit('reaction:send', { emoji })}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
