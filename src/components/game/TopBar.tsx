'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Eye, Lightbulb, LogOut, Wifi } from 'lucide-react';
import { BrandMark, Wordmark } from '@/components/BrandMark';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { HowToPlayDialog } from '@/components/HowToPlayDialog';
import { SoundToggle } from '@/components/SoundToggle';
import { RoomCodePill } from '@/components/room/RoomCodePill';
import { TimerRing } from './TimerRing';
import { useGameStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import { clearSession } from '@/lib/session';
import { TIMING } from '@/lib/game-config';
import { cn } from '@/lib/cn';

export function TopBar() {
  const router = useRouter();
  const state = useGameStore((store) => store.state);
  const ping = useGameStore((store) => store.ping);
  const connected = useGameStore((store) => store.connected);
  const resetRoom = useGameStore((store) => store.resetRoom);
  const [leaveOpen, setLeaveOpen] = useState(false);

  if (!state) return null;

  const totalMs =
    state.phase === 'choosing'
      ? TIMING.choosingMs
      : state.phase === 'drawing'
        ? state.settings.drawTime * 1000
        : state.phase === 'round_end'
          ? TIMING.roundEndMs
          : 0;

  const showTimer = state.phase === 'choosing' || state.phase === 'drawing' || state.phase === 'round_end';
  const totalTurns = Math.max(1, state.turnOrder.length);
  const turnNumber = Math.min(totalTurns, state.turnIndex + 1);
  const artist = state.players.find((player) => player.id === state.artistId);
  const maskedWord = state.you.maskedWord ?? '';

  const pingDot = !connected || ping === null ? 'bg-muted' : ping < 120 ? 'bg-lime' : ping < 300 ? 'bg-amber-300' : 'bg-danger';
  const pingIcon = !connected || ping === null ? 'text-muted' : ping < 120 ? 'text-lime' : ping < 300 ? 'text-amber-300' : 'text-danger';

  const leave = () => {
    getSocket().emit('room:leave', () => undefined);
    clearSession(state.code);
    resetRoom();
    router.push('/');
  };

  return (
    <>
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/6 bg-night/70 px-2.5 py-2 backdrop-blur-xl sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <button type="button" onClick={() => setLeaveOpen(true)} className="flex items-center gap-2.5" title="Leave room">
          <BrandMark size={30} />
          <Wordmark className="hidden md:inline" />
        </button>

        <span className="hidden h-6 w-px bg-white/10 sm:block" />

        <span className="chip hidden border-white/8 bg-white/4 sm:inline-flex" title={`Round ${Math.max(1, state.round)} of ${state.totalRounds}`}>
          {state.phase === 'game_end' ? 'Final' : `Turn ${turnNumber}/${totalTurns}`}
        </span>

        {state.phase !== 'game_end' ? (
          <span className="hidden text-[10px] text-muted xl:inline">
            Round {Math.max(1, state.round)}/{state.totalRounds}
          </span>
        ) : null}

        {state.phase === 'drawing' ? (
          <span className="hidden min-w-0 items-center gap-2 lg:flex">
            <span className="hidden max-w-[140px] truncate text-[10px] uppercase tracking-[0.14em] text-muted xl:inline">
              {state.you.isArtist ? 'You draw' : `${artist?.nickname ?? 'Someone'} draws`}
            </span>
            {state.you.isArtist ? (
              <span className="max-w-[220px] truncate font-display text-lg font-bold text-lime">{state.you.word}</span>
            ) : (
              <>
                <span className="max-w-[260px] truncate font-display text-base font-bold tracking-[0.16em]">{maskedWord}</span>
                {state.settings.hints > 0 ? (
                  <span className="hidden items-center gap-1 xl:flex">
                    {Array.from({ length: state.settings.hints }).map((_, index) => (
                      <span
                        key={index}
                        className={`h-1.5 w-2.5 rounded-full ${
                          index < state.hintIndices.length ? 'bg-lime' : 'bg-white/15'
                        }`}
                      />
                    ))}
                  </span>
                ) : null}
              </>
            )}
          </span>
        ) : state.phase === 'choosing' ? (
          <span className="hidden items-center gap-1 text-[11px] text-muted lg:flex">
            <Crown size={11} className="text-lime" />
            {artist?.nickname ?? 'Someone'} is choosing…
          </span>
        ) : null}

        {state.you.isSpectator ? (
          <span className="chip border-accent/25 bg-accent/10 text-accent">
            <Eye size={10} /> spectator
          </span>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {showTimer ? <TimerRing endsAt={state.phaseEndsAt} totalMs={totalMs} /> : null}

        <RoomCodePill code={state.code} className="hidden sm:inline-flex" />

        <span
          className="hidden items-center gap-1.5 rounded-full border border-white/8 bg-white/4 px-2 py-1 text-[10px] text-muted md:flex"
          title={ping !== null ? `${ping}ms round trip` : 'Connection quality'}
        >
          <Wifi size={11} className={pingIcon} />
          <span className={cn('h-1.5 w-1.5 rounded-full', pingDot)} />
          {ping !== null ? `${ping}ms` : '—'}
        </span>

        <SoundToggle />

        <HowToPlayDialog
          trigger={
            <button type="button" className="btn btn-ghost h-9 w-9 p-0" aria-label="How to play">
              <Lightbulb size={16} />
            </button>
          }
        />

        <button
          type="button"
          className="btn btn-ghost h-9 w-9 p-0"
          title="Leave room"
          aria-label="Leave room"
          onClick={() => setLeaveOpen(true)}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
    <ConfirmDialog
      open={leaveOpen}
      onOpenChange={setLeaveOpen}
      title="Leave the room?"
      description="Your seat and drawing will be given up. You can rejoin with the room code."
      confirmLabel="Leave room"
      destructive
      onConfirm={leave}
    />
    </>
  );
}
