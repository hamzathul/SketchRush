'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import { ArrowRight, Crown, Flame, Home, Medal, RotateCcw, Sparkles, Trophy, Users, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '@/components/Avatar';
import { useGameStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import { clearSession } from '@/lib/session';
import { sfx } from '@/lib/sound';
import { cn } from '@/lib/cn';

const CONFETTI_COLORS = ['#b8f36b', '#22d3ee', '#8b5cf6', '#fbbf24', '#ffffff'];

export function GameEndOverlay() {
  const router = useRouter();
  const state = useGameStore((store) => store.state);
  const resetRoom = useGameStore((store) => store.resetRoom);
  const fired = useRef('');

  const results = state?.gameResults ?? null;
  const active = state?.phase === 'game_end' && Boolean(results?.length);

  useEffect(() => {
    if (!active) fired.current = '';
  }, [active]);

  useEffect(() => {
    if (!active || !state || !results) return;
    const key = `${results[0]?.playerId}-${results[0]?.score}-${results.length}`;
    if (fired.current === key) return;
    fired.current = key;
    sfx.win();

    const end = Date.now() + 2_200;
    let frameId = 0;
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.75 },
        colors: CONFETTI_COLORS,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.75 },
        colors: CONFETTI_COLORS,
        disableForReducedMotion: true,
      });
      if (Date.now() < end) frameId = requestAnimationFrame(frame);
    };
    frame();

    return () => {
      cancelAnimationFrame(frameId);
      confetti.reset();
    };
  }, [active, results, state]);

  useEffect(() => {
    return () => {
      confetti.reset();
    };
  }, []);

  if (!active || !state || !results) return null;

  const first = results[0];
  const second = results[1];
  const third = results[2];
  const rest = results.slice(3);
  const isHost = state.hostId === state.you.id;
  const isPlayer = !state.you.isSpectator;

  const fastest = results
    .filter((result) => result.stats.fastestGuessMs !== null)
    .sort((a, b) => (a.stats.fastestGuessMs ?? 0) - (b.stats.fastestGuessMs ?? 0))[0];
  const bestArtist = [...results].sort((a, b) => b.stats.pointsAsArtist - a.stats.pointsAsArtist)[0];
  const mostGuesses = [...results].sort((a, b) => b.stats.correctGuesses - a.stats.correctGuesses)[0];

  const rematch = () => {
    confetti.reset();
    sfx.click();
    getSocket().emit('game:rematch', (result) => {
      if (!result.ok) toast.error(result.error);
    });
  };

  const backToLobby = () => {
    confetti.reset();
    getSocket().emit('game:to-lobby', (result) => {
      if (!result.ok) toast.error(result.error);
    });
  };

  const leave = () => {
    confetti.reset();
    getSocket().emit('room:leave', () => undefined);
    clearSession(state.code);
    resetRoom();
    router.push('/');
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-night/88 p-3 backdrop-blur-lg sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto w-full max-w-3xl"
      >
        <div className="panel relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-lime/12 via-accent/5 to-transparent" />

          <div className="relative px-5 pb-5 pt-7 text-center sm:px-8">
            <div className="mb-3 flex justify-center">
              <span className="chip border-lime/25 bg-lime/10 text-lime">
                <Sparkles size={11} /> Final scores
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
              {first ? (
                <>
                  <span className="text-lime">{first.nickname}</span> wins!
                </>
              ) : (
                'Game over'
              )}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              {first ? `${first.score} points of pure artistic vision.` : 'Good game, everyone.'} Room{' '}
              <span className="font-semibold tracking-wider text-ink">{state.code}</span>.
            </p>
          </div>

          <div className="relative grid grid-cols-3 items-end gap-2 px-4 sm:gap-4 sm:px-8">
            {[second, first, third].map((result, columnIndex) => {
              if (!result) return <div key={`empty-${columnIndex}`} />;
              const place = result === first ? 1 : result === second ? 2 : 3;
              return (
                <div
                  key={result.playerId}
                  className={cn(
                    'flex flex-col items-center rounded-2xl border p-3 text-center transition sm:p-4',
                    place === 1
                      ? 'border-lime/30 bg-lime/8 pb-5 sm:pb-7'
                      : 'border-white/7 bg-white/3',
                  )}
                >
                  <div className="relative mb-2">
                    <Avatar
                      seed={result.avatarSeed}
                      name={result.nickname}
                      size={place === 1 ? 64 : 46}
                      className="rounded-2xl"
                    />
                    {place === 1 ? (
                      <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-lime text-black shadow-lg">
                        <Crown size={13} />
                      </span>
                    ) : null}
                  </div>
                  <p className="w-full truncate text-xs font-semibold sm:text-sm">{result.nickname}</p>
                  <p
                    className={cn(
                      'font-display font-bold tabular-nums',
                      place === 1 ? 'text-2xl text-lime' : 'text-lg',
                    )}
                  >
                    {result.score}
                  </p>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
                    {place === 1 ? 'champion' : place === 2 ? '2nd' : '3rd'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="relative mt-6 grid gap-2 px-4 sm:grid-cols-3 sm:px-8">
            <Highlight
              icon={<Zap size={14} />}
              label="Fastest guess"
              value={fastest ? `${fastest.nickname} · ${((fastest.stats.fastestGuessMs ?? 0) / 1000).toFixed(1)}s` : '—'}
            />
            <Highlight
              icon={<Trophy size={14} />}
              label="Best artist"
              value={bestArtist && bestArtist.stats.pointsAsArtist > 0 ? `${bestArtist.nickname} · ${bestArtist.stats.pointsAsArtist}` : '—'}
            />
            <Highlight
              icon={<Medal size={14} />}
              label="Sharpest guesser"
              value={mostGuesses && mostGuesses.stats.correctGuesses > 0 ? `${mostGuesses.nickname} · ${mostGuesses.stats.correctGuesses}` : '—'}
            />
          </div>

          {rest.length > 0 ? (
            <div className="relative mt-5 px-4 sm:px-8">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Everyone else</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {rest.map((result) => (
                  <div
                    key={result.playerId}
                    className="flex items-center gap-2 rounded-xl border border-white/6 bg-white/3 px-2.5 py-1.5"
                  >
                    <Avatar seed={result.avatarSeed} name={result.nickname} size={24} className="rounded-md" />
                    <span className="min-w-0 flex-1 truncate text-xs">{result.nickname}</span>
                    <span className="flex items-center gap-1 text-[10px] text-muted">
                      <Flame size={9} /> {result.stats.correctGuesses}
                    </span>
                    <span className="font-display text-xs font-bold">{result.score}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="relative mt-6 flex flex-col gap-2 border-t border-white/7 bg-black/15 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <Users size={12} />
              {state.rematchVotes}/{state.rematchNeeded} players want a rematch
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn btn-ghost" onClick={leave}>
                <Home size={15} /> Leave
              </button>
              {isHost ? (
                <button type="button" className="btn btn-ghost" onClick={backToLobby} title="Return everyone to the lobby">
                  Back to lobby
                </button>
              ) : null}
              {isPlayer ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={rematch}
                  disabled={state.you.votedRematch}
                >
                  {state.you.votedRematch ? (
                    <>Waiting for others…</>
                  ) : (
                    <>
                      <RotateCcw size={15} /> Rematch
                    </>
                  )}
                </button>
              ) : (
                <span className="chip border-accent/25 bg-accent/10 text-accent">
                  <ArrowRight size={10} /> You&apos;re in the next game
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted">
          Tip: the host can return to the lobby to change rounds, time or custom words.
        </p>
      </motion.div>
    </div>
  );
}

function Highlight({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/3 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-muted">
        <span className="text-accent-2">{icon}</span>
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-semibold">{value}</p>
    </div>
  );
}
