'use client';

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Check, Clock3, Eye, Sparkles, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { Avatar } from '@/components/Avatar';
import { useGameStore } from '@/lib/store';
import { TIMING } from '@/lib/game-config';
import { useServerNow } from '@/lib/use-server-now';
import { sfx } from '@/lib/sound';

export function RoundEndOverlay() {
  const state = useGameStore((store) => store.state);
  const now = useServerNow(200);
  const firedFor = useRef<number | null>(null);

  const result = state?.roundResult ?? null;
  const active = state?.phase === 'round_end' && Boolean(result);

  useEffect(() => {
    if (!active || !result || !state) return;
    if (firedFor.current === result.endedAt) return;
    firedFor.current = result.endedAt;
    sfx.reveal();

    if (result.guesses.some((guess) => guess.playerId === state.you.id)) {
      confetti({
        particleCount: 70,
        spread: 65,
        startVelocity: 34,
        origin: { y: 0.62 },
        colors: ['#b8f36b', '#22d3ee', '#8b5cf6', '#ffffff'],
        disableForReducedMotion: true,
      });
    }
  }, [active, result, state]);

  if (!active || !state || !result) return null;

  const youGuessed = result.guesses.some((guess) => guess.playerId === state.you.id);
  const totalTurns = Math.max(1, state.turnOrder.length);
  const turnNumber = Math.min(totalTurns, state.turnIndex + 1);
  const isLastTurn = state.round >= state.totalRounds && state.turnIndex >= totalTurns - 1;
  const seconds = state.phaseEndsAt ? Math.max(0, Math.ceil((state.phaseEndsAt - now) / 1000)) : 0;
  const progress = state.phaseEndsAt
    ? Math.max(0, Math.min(1, (state.phaseEndsAt - now) / TIMING.roundEndMs))
    : 0;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-night/75 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="panel w-full max-w-lg overflow-hidden"
      >
        <div className="relative border-b border-white/7 px-6 pb-5 pt-6 text-center">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-lime/10 to-transparent" />
          <p className="relative text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">
            Round {Math.max(1, state.round)} of {state.totalRounds} · Turn {turnNumber}/{totalTurns}
          </p>
          <p className="relative mt-2 text-sm text-muted">Turn complete. The word was</p>
          <h2 className="relative mt-1 font-display text-4xl font-bold tracking-tight text-lime sm:text-5xl">
            {result.word}
          </h2>

          <div className="relative mt-4 inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-3 py-1.5">
            <span className="text-[11px] text-muted">Artist</span>
            <span className="text-xs font-semibold">{result.artistNickname}</span>
            <span className="font-display text-xs font-bold text-lime">+{result.artistPoints}</span>
          </div>
        </div>

        <div className="max-h-[42dvh] overflow-y-auto px-4 py-4">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Correct guesses</p>
            <span className="chip">{result.guesses.length} found it</span>
          </div>

          {result.guesses.length === 0 ? (
            <div className="rounded-xl border border-white/6 bg-white/3 px-4 py-5 text-center">
              <p className="text-sm text-muted">Nobody got it. Tough crowd.</p>
              <p className="mt-1 text-[11px] text-muted/70">The artist only scores when someone guesses correctly.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {result.guesses.map((guess) => (
                <div
                  key={guess.playerId}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${
                    guess.playerId === state.you.id
                      ? 'border-lime/25 bg-lime/8'
                      : 'border-white/6 bg-white/3'
                  }`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime/15 text-lime">
                    <Check size={12} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {guess.nickname}
                    {guess.playerId === state.you.id ? (
                      <span className="ml-1.5 text-[10px] text-muted">you</span>
                    ) : null}
                  </span>
                  <span className="text-[10px] text-muted">{(guess.timeMs / 1000).toFixed(1)}s</span>
                  <span className="font-display text-sm font-bold text-lime">+{guess.points}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-white/7 px-4 py-3">
          {youGuessed ? (
            <p className="mb-2 flex items-center justify-center gap-1.5 text-xs text-lime">
              <Sparkles size={12} /> You got it! Points in the bank.
            </p>
          ) : null}
          <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-[width] duration-200"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <Clock3 size={12} /> {isLastTurn ? 'Final scores' : 'Next player'} in {seconds}s
            </span>
            <span className="flex items-center gap-1.5">
              {state.you.isSpectator ? (
                <>
                  <Eye size={12} /> Spectating
                </>
              ) : (
                <>
                  <Trophy size={12} /> Top score {state.players[0]?.score ?? 0}
                </>
              )}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
