'use client';

import { useGameStore } from '@/lib/store';
import { Avatar } from '@/components/Avatar';
import { Crown, Eye, Flame, Pencil } from 'lucide-react';
import { cn } from '@/lib/cn';

export function PlayerRail({ variant = 'desktop', className }: { variant?: 'desktop' | 'mobile'; className?: string }) {
  const state = useGameStore((store) => store.state);
  if (!state) return null;

  const totalTurns = Math.max(1, state.turnOrder.length);
  const turnNumber = Math.min(totalTurns, state.turnIndex + 1);

  if (variant === 'mobile') {
    return (
      <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-white/6 px-2 py-2 no-scrollbar lg:hidden max-lg:landscape:gap-1 max-lg:landscape:py-1">
        {state.players.map((player) => (
          <div
            key={player.id}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5',
              player.id === state.you.id ? 'border-accent/40 bg-accent/10' : 'border-white/8 bg-white/4',
              !player.connected && 'opacity-50',
            )}
          >
            <Avatar
              seed={player.avatarSeed}
              name={player.nickname}
              size={24}
              className="rounded-lg"
              cosmetic={player.cosmetic}
              hot={player.streak >= 2}
            />
            <span className="max-w-[72px] truncate text-[11px] font-medium">{player.nickname}</span>
            <span className="font-display text-[11px] font-bold text-lime">{player.score}</span>
            {player.isSpectator ? <Eye size={10} className="text-accent" /> : null}
            {player.id === state.artistId ? <Pencil size={10} className="text-accent-2" /> : null}
            {state.guessedIds.includes(player.id) ? <span className="text-[9px] text-lime">✓</span> : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <aside className={cn('hidden h-full w-full shrink-0 flex-col border-r border-white/6 bg-black/10 lg:flex', className)}>
      <div className="border-b border-white/6 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Turn</p>
        <p className="font-display text-xl font-bold">
          {turnNumber}
          <span className="text-sm font-medium text-muted"> / {totalTurns}</span>
        </p>
        <p className="mt-0.5 text-[10px] text-muted">
          Round {Math.max(1, state.round)} of {state.totalRounds}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {state.players.map((player, index) => {
          const isYou = player.id === state.you.id;
          const isArtist = player.id === state.artistId;
          return (
            <div
              key={player.id}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition',
                isYou ? 'border-accent/30 bg-accent/10' : 'border-transparent hover:bg-white/4',
                !player.connected && 'opacity-45',
              )}
            >
              <span className="w-3.5 shrink-0 text-center font-display text-[11px] font-bold text-muted">{index + 1}</span>
              <div className="relative shrink-0">
                <Avatar
                  seed={player.avatarSeed}
                  name={player.nickname}
                  size={34}
                  className="rounded-lg"
                  cosmetic={player.cosmetic}
                  hot={player.streak >= 2}
                />
                {isArtist ? (
                  <span className="absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent text-white shadow ring-2 ring-night">
                    <Pencil size={10} strokeWidth={2.5} />
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="truncate text-[13px] font-medium">{player.nickname}</span>
                  {player.id === state.hostId ? <Crown size={10} className="shrink-0 text-lime" /> : null}
                  {isYou ? <span className="text-[9px] text-muted">you</span> : null}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted">
                  {player.isSpectator ? (
                    <>
                      <Eye size={9} /> spectator · next round
                    </>
                  ) : state.guessedIds.includes(player.id) ? (
                    <span className="text-lime">guessed ✓</span>
                  ) : isArtist ? (
                    <span className="text-accent-2">
                      {state.phase === 'choosing' ? 'choosing' : 'drawing'}
                    </span>
                  ) : (
                    <span>{player.connected ? 'playing' : 'offline'}</span>
                  )}
                  {player.streak >= 2 ? (
                    <span className="ml-1 flex items-center gap-0.5 text-amber-300">
                      <Flame size={9} /> {player.streak}
                    </span>
                  ) : null}
                </div>
              </div>
              <span className="font-display text-sm font-bold tabular-nums">{player.score}</span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/6 px-4 py-2.5 text-[10px] text-muted">
        {state.players.filter((player) => player.connected).length} connected · {state.settings.drawTime}s turns
      </div>
    </aside>
  );
}
