'use client';

import { useGameStore } from '@/lib/store';
import { Avatar } from '@/components/Avatar';
import { Eye, Pencil, Sparkles } from 'lucide-react';

export function WordBanner() {
  const state = useGameStore((store) => store.state);
  if (!state) return null;

  const artist = state.players.find((player) => player.id === state.artistId);
  const isArtist = state.you.isArtist;
  const hintsUsed = state.hintIndices.length;

  if (state.phase === 'choosing') {
    return (
      <div className="flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-white/7 bg-surface/70 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {artist ? <Avatar seed={artist.avatarSeed} name={artist.nickname} size={30} className="rounded-lg" /> : null}
          <p className="truncate text-sm">
            <span className="font-semibold">{artist?.nickname ?? 'Someone'}</span>{' '}
            <span className="text-muted">is choosing a word…</span>
          </p>
        </div>
        <span className="chip shrink-0 border-accent/20 bg-accent/10 text-accent">
          <Sparkles size={11} /> {isArtist ? 'Your pick' : 'Get ready'}
        </span>
      </div>
    );
  }

  if (state.phase === 'drawing') {
    return (
      <div className="flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-white/7 bg-surface/70 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {artist ? <Avatar seed={artist.avatarSeed} name={artist.nickname} size={30} className="rounded-lg" /> : null}
          <div className="min-w-0">
            <p className="truncate text-xs text-muted">
              {isArtist ? 'You are drawing' : `${artist?.nickname ?? 'Someone'} is drawing`}
            </p>
            {isArtist ? (
              <p className="font-display text-xl font-bold tracking-tight text-lime sm:text-2xl">{state.you.word}</p>
            ) : (
              <p className="font-display text-lg font-bold tracking-[0.22em] text-ink sm:text-2xl">
                {(state.you.maskedWord ?? '').split('').map((char, index) =>
                  char === ' ' ? (
                    <span key={index} className="inline-block w-2.5" />
                  ) : (
                    <span key={index}>{char}</span>
                  ),
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {isArtist ? (
            <span className="chip border-white/10 bg-white/5 text-muted">
              <Pencil size={10} /> Draw only
            </span>
          ) : (
            <div className="flex items-center gap-1">
              {Array.from({ length: state.settings.hints }).map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 w-4 rounded-full ${index < hintsUsed ? 'bg-lime' : 'bg-white/15'}`}
                />
              ))}
              <span className="ml-1 text-[10px] text-muted">
                {hintsUsed}/{state.settings.hints} hints
              </span>
            </div>
          )}
          {state.you.isSpectator ? (
            <span className="chip">
              <Eye size={10} /> Spectating
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  if (state.phase === 'round_end') {
    return (
      <div className="flex shrink-0 items-center justify-center rounded-2xl border border-white/7 bg-surface/70 px-4 py-2 text-sm text-muted">
        Round over — the word was{' '}
        <span className="ml-1.5 font-display text-base font-bold text-lime">{state.roundResult?.word}</span>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center justify-center rounded-2xl border border-white/7 bg-surface/70 px-4 py-2 text-sm text-muted">
      Game over — nice drawing, questionable guessing.
    </div>
  );
}
