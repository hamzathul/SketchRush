'use client';

import { useState } from 'react';
import { Loader2, Sparkles, Star, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/Modal';
import { useGameStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import { artistBonusPoints, artistPointsForGuess } from '@/lib/scoring';
import { TIMING } from '@/lib/game-config';
import { useServerNow } from '@/lib/use-server-now';
import { sfx } from '@/lib/sound';

export function WordChooser() {
  const state = useGameStore((store) => store.state);
  const now = useServerNow(200);
  const [pending, setPending] = useState(false);

  const open = Boolean(
    state && state.phase === 'choosing' && state.you.isArtist && state.you.choices.length > 0,
  );

  if (!state) return null;

  const seconds = state.phaseEndsAt ? Math.max(0, Math.ceil((state.phaseEndsAt - now) / 1000)) : 0;
  const progress = state.phaseEndsAt
    ? Math.max(0, Math.min(1, (state.phaseEndsAt - now) / TIMING.choosingMs))
    : 0;

  const choose = (word: string) => {
    if (pending) return;
    setPending(true);
    sfx.click();
    getSocket().emit('word:choose', { word }, (result) => {
      setPending(false);
      if (!result.ok) toast.error(result.error);
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={() => undefined}
      title="Pick your word"
      description="Three choices, one pen. Harder words pay more — but they are harder to draw."
      hideClose
    >
      <div className="mb-4 flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <Timer size={13} className="text-accent-2" /> Auto-picks in
        </span>
        <span className={`font-display text-lg font-bold tabular-nums ${seconds <= 3 ? 'text-danger' : 'text-lime'}`}>
          {seconds}s
        </span>
      </div>
      <div className="mb-4 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-lime to-accent-2 transition-[width] duration-200"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="space-y-2.5">
        {state.you.choices.map((choice) => (
          <button
            key={choice.word}
            type="button"
            disabled={pending}
            onClick={() => choose(choice.word)}
            className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/4 p-3.5 text-left transition hover:border-lime/45 hover:bg-lime/8 disabled:opacity-60"
          >
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-0.5">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Star
                    key={index}
                    size={12}
                    className={index < choice.stars ? 'fill-lime text-lime' : 'text-white/15'}
                  />
                ))}
                <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted">
                  {choice.stars === 1 ? 'easy' : choice.stars === 2 ? 'medium' : 'hard'}
                </span>
              </div>
              <p className="truncate font-display text-lg font-bold tracking-tight sm:text-xl">{choice.word}</p>
              <p className="mt-0.5 text-[11px] text-muted">
                +{artistPointsForGuess(choice.stars)} per guesser · +{artistBonusPoints(choice.stars)} when 75% guess it
              </p>
            </div>
            {pending ? (
              <Loader2 size={16} className="shrink-0 animate-spin text-muted" />
            ) : (
              <Sparkles size={17} className="shrink-0 text-muted transition group-hover:text-lime" />
            )}
          </button>
        ))}
      </div>

      <p className="mt-4 text-center text-[11px] text-muted">
        Tip: don&apos;t pick a word you can only draw as a stick figure. Unless that&apos;s the bit.
      </p>
    </Modal>
  );
}
