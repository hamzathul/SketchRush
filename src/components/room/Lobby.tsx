'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Clock,
  Copy,
  Crown,
  Lightbulb,
  Link2,
  Loader2,
  Lock,
  LogOut,
  Play,
  QrCode,
  Settings2,
  Share2,
  Sparkles,
  Star,
  Target,
  Unlock,
  UserCog,
  UserMinus,
  Users,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Avatar } from '@/components/Avatar';
import { BrandMark, Wordmark } from '@/components/BrandMark';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { HowToPlayDialog } from '@/components/HowToPlayDialog';
import { Modal } from '@/components/Modal';
import { SoundToggle } from '@/components/SoundToggle';
import { RoomCodePill } from '@/components/room/RoomCodePill';
import { ChatPanel } from '@/components/game/ChatPanel';
import { ReactionLayer } from '@/components/game/ReactionLayer';
import { cn } from '@/lib/cn';
import { copyText } from '@/lib/clipboard';
import { useGameStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import { artistBonusPoints, artistPointsForGuess } from '@/lib/scoring';
import { clearSession } from '@/lib/session';
import { sfx } from '@/lib/sound';
import type { RoomSettings } from '@/lib/types';
import { BRAND } from '@/lib/brand';

const ROUND_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10];
const TIME_OPTIONS = [30, 45, 60, 80, 100, 120, 150, 180];
const MAX_PLAYER_OPTIONS = [4, 6, 8, 10, 12, 16];
const HINT_OPTIONS = [0, 1, 2, 3];

type PendingAction =
  | { kind: 'kick'; playerId: string; nickname: string }
  | { kind: 'host'; playerId: string; nickname: string }
  | { kind: 'leave' };

export function Lobby() {
  const router = useRouter();
  const state = useGameStore((store) => store.state);
  const resetRoom = useGameStore((store) => store.resetRoom);
  const [inviteUrl, setInviteUrl] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [wordsOpen, setWordsOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const code = state?.code ?? '';

  useEffect(() => {
    if (!code) return;
    setInviteUrl(`${window.location.origin}/room/${code}`);
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, [code]);

  const activePlayers = useMemo(
    () => state?.players.filter((player) => !player.isSpectator) ?? [],
    [state?.players],
  );

  if (!state) return null;

  const isHost = state.you.id === state.hostId;
  const connectedPlayers = activePlayers.filter((player) => player.connected);
  const canStart = isHost && connectedPlayers.length >= 2;
  const socket = getSocket();

  const updateSettings = (patch: Partial<RoomSettings>) => {
    socket.emit('room:update-settings', { settings: patch }, (result) => {
      if (!result.ok) toast.error(result.error);
    });
  };

  const share = async () => {
    if (canNativeShare) {
      try {
        await navigator.share({
          title: `Join ${BRAND.name} room ${state.code}`,
          text: 'Come draw badly and guess brilliantly.',
          url: inviteUrl,
        });
        return;
      } catch {
        // User cancelled or sharing failed; fall back to clipboard.
      }
    }
    const ok = await copyText(inviteUrl);
    if (ok) toast.success('Invite link copied');
    else toast.error('Could not copy the link');
  };

  const copyLink = async () => {
    const ok = await copyText(inviteUrl);
    if (ok) toast.success('Invite link copied');
    else toast.error('Could not copy the link');
  };

  const startGame = () => {
    sfx.start();
    socket.emit('game:start', (result) => {
      if (!result.ok) toast.error(result.error);
    });
  };

  const leaveNow = () => {
    socket.emit('room:leave', () => undefined);
    clearSession(state.code);
    resetRoom();
    router.push('/');
  };

  const leave = () => setPending({ kind: 'leave' });

  const kick = (playerId: string, nickname: string) => {
    setPending({ kind: 'kick', playerId, nickname });
  };

  const makeHost = (playerId: string, nickname: string) => {
    setPending({ kind: 'host', playerId, nickname });
  };

  const confirmPending = () => {
    if (!pending) return;

    if (pending.kind === 'leave') {
      leaveNow();
      return;
    }

    if (pending.kind === 'kick') {
      socket.emit('room:kick', { playerId: pending.playerId }, (result) => {
        if (!result.ok) toast.error(result.error);
      });
      return;
    }

    socket.emit('room:transfer-host', { playerId: pending.playerId }, (result) => {
      if (!result.ok) toast.error(result.error);
      else toast.success(`${pending.nickname} is now the host`);
    });
  };

  const saveCustomWords = () => {
    const words = customText
      .split(/[\n,]/)
      .map((word) => word.trim())
      .filter((word) => word.length > 0 && word.length <= 30);
    const unique = Array.from(new Set(words)).slice(0, 200);
    updateSettings({ customWords: unique });
    setWordsOpen(false);
    toast.success(unique.length ? `${unique.length} custom word${unique.length === 1 ? '' : 's'} saved` : 'Custom words cleared');
  };

  const customCount = state.settings.customWords.length;

  return (
    <div className="min-h-dvh pb-24 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-white/6 bg-night/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button type="button" onClick={leave} className="flex items-center gap-2.5" title="Leave room">
            <BrandMark />
            <Wordmark className="hidden sm:inline" />
          </button>
          <div className="flex items-center gap-2">
            <RoomCodePill code={state.code} />
            <SoundToggle />
            <HowToPlayDialog
              trigger={
                <button type="button" className="btn btn-ghost h-9 w-9 p-0" aria-label="How to play">
                  <Lightbulb size={16} />
                </button>
              }
            />
            <button type="button" onClick={leave} className="btn btn-ghost h-9 w-9 p-0" aria-label="Leave room" title="Leave room">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-9">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="chip border-lime/20 bg-lime/8 text-lime">
                <span className="h-1.5 w-1.5 rounded-full bg-lime" /> Lobby
              </span>
              {state.settings.locked ? (
                <span className="chip">
                  <Lock size={11} /> Locked
                </span>
              ) : null}
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Room <span className="tracking-[0.14em] text-lime">{state.code}</span>
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted">
              Share the code or link. The game starts when the host says so — at least 2 players needed.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-ghost" onClick={copyLink}>
              <Copy size={15} /> <span className="hidden sm:inline">Copy link</span>
              <span className="sm:hidden">Copy</span>
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setQrOpen(true)}>
              <QrCode size={15} /> QR
            </button>
            {canNativeShare ? (
              <button type="button" className="btn btn-accent" onClick={share}>
                <Share2 size={15} /> Invite
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(340px,400px)_minmax(0,1fr)]">
          <section className="panel p-4 sm:p-5 lg:order-2 lg:col-start-2">
            <div className="flex flex-col gap-3 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">Ready to play?</h2>
                <p className="mt-1 text-sm text-muted">
                  {connectedPlayers.length < 2
                    ? 'Waiting for at least one more player…'
                    : `${connectedPlayers.length} players ready · ${state.settings.rounds} round${state.settings.rounds === 1 ? '' : 's'}`}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {isHost ? (
                  <button
                    type="button"
                    className="btn btn-primary px-6 py-2.5 text-sm"
                    disabled={!canStart}
                    onClick={startGame}
                  >
                    <Play size={16} /> Start game
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/4 px-4 py-2.5 text-sm text-muted">
                    <Loader2 size={15} className="animate-spin" /> Waiting for the host…
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat icon={<Target size={13} />} value={`${state.settings.rounds}`} label="rounds" />
                  <Stat icon={<Clock size={13} />} value={`${state.settings.drawTime}s`} label="per turn" />
                  <Stat icon={<Lightbulb size={13} />} value={`${state.settings.hints}`} label="hints" />
                </div>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between border-t border-white/6 pt-4">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Users size={18} className="text-accent-2" /> Players
              </h2>
              <span className="chip">
                {activePlayers.length}/{state.settings.maxPlayers}
              </span>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence initial={false}>
                {state.players.map((player) => {
                  const isYou = player.id === state.you.id;
                  return (
                    <motion.div
                      key={player.id}
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      className={cn(
                        'group flex items-center gap-3 rounded-2xl border p-3 transition',
                        isYou ? 'border-accent/35 bg-accent/10' : 'border-white/7 bg-white/3',
                        !player.connected && 'opacity-50',
                      )}
                    >
                      <Avatar
                        seed={player.avatarSeed}
                        name={player.nickname}
                        size={42}
                        className="rounded-xl"
                        cosmetic={player.cosmetic}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold">{player.nickname}</span>
                          {player.id === state.hostId ? <Crown size={13} className="shrink-0 text-lime" /> : null}
                          {isYou ? <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-muted">you</span> : null}
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {player.isSpectator ? 'Spectator — joins next game' : player.connected ? 'Ready' : 'Reconnecting…'}
                        </p>
                      </div>

                      {isHost && !isYou ? (
                        <div className="flex flex-col gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                          <button
                            type="button"
                            className="rounded-md p-1 text-muted transition hover:bg-white/10 hover:text-ink"
                            title={`Make ${player.nickname} host`}
                            onClick={() => makeHost(player.id, player.nickname)}
                          >
                            <UserCog size={14} />
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1 text-muted transition hover:bg-danger/15 hover:text-danger"
                            title={`Remove ${player.nickname}`}
                            onClick={() => kick(player.id, player.nickname)}
                          >
                            <UserMinus size={14} />
                          </button>
                        </div>
                      ) : null}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              <button
                type="button"
                onClick={copyLink}
                className="flex min-h-[70px] items-center justify-center gap-2 rounded-2xl border border-dashed border-white/12 p-3 text-xs font-medium text-muted transition hover:border-accent/40 hover:bg-accent/5 hover:text-ink"
              >
                <Link2 size={15} /> Invite a friend
              </button>
            </div>

            <div className="mt-5 flex items-start gap-2 rounded-xl border border-white/6 bg-white/3 px-3 py-2.5 text-xs text-muted">
              <Sparkles size={14} className="mt-0.5 shrink-0 text-lime" />
              <p>
                Room code is <span className="font-semibold text-ink">{state.code}</span>. Anyone with the link can join
                until the room fills or the host locks it.
              </p>
            </div>

            <div className="mt-6 grid gap-4 border-t border-white/6 pt-5 xl:grid-cols-[1.12fr_0.88fr]">
              <div>
                <h3 className="font-display text-sm font-semibold">How a turn works</h3>
                <ol className="mt-3 space-y-2">
                  {[
                    {
                      title: 'The artist picks a word',
                      text: 'Three choices appear — easy, medium or hard. Harder words pay more.',
                    },
                    {
                      title: 'Draw before the clock runs out',
                      text: `${state.settings.drawTime} seconds on the canvas. Hints reveal letters along the way.`,
                    },
                    {
                      title: 'Everyone else guesses in chat',
                      text: 'The first correct guess ends the turn. Speed and streaks score big.',
                    },
                  ].map((step, index) => (
                    <li
                      key={step.title}
                      className="flex gap-3 rounded-xl border border-white/6 bg-white/3 px-3 py-2.5"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent/15 font-display text-[11px] font-bold text-accent-2">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-ink">{step.title}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{step.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-xl border border-white/6 bg-black/15 p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-2">Word values</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  Artist points. Guessers also earn speed bonuses.
                </p>
                <div className="mt-3 space-y-1.5">
                  {[
                    { stars: 1, label: 'Easy' },
                    { stars: 2, label: 'Medium' },
                    { stars: 3, label: 'Hard' },
                  ].map((tier) => (
                    <div key={tier.label} className="rounded-lg border border-white/5 bg-white/3 px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: 3 }).map((_, index) => (
                            <Star
                              key={index}
                              size={10}
                              className={index < tier.stars ? 'fill-lime text-lime' : 'text-white/15'}
                            />
                          ))}
                          <span className="ml-1.5 text-[11px] text-muted">{tier.label}</span>
                        </span>
                        <span className="font-display text-[11px] font-bold text-lime">
                          +{artistPointsForGuess(tier.stars)} / guess
                        </span>
                      </div>
                      <p className="mt-0.5 text-right text-[9px] text-muted">
                        +{artistBonusPoints(tier.stars)} when 75% guess it
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-2.5 border-t border-white/6 pt-4 text-xs leading-relaxed text-muted">
              <Lightbulb size={15} className="mt-0.5 shrink-0 text-lime" />
              <p>
                Pro tip: harder words pay the artist more. In mixed mode you get one easy, one medium and one hard word
                to choose from.
              </p>
            </div>
          </section>

          <aside className="space-y-4 lg:order-1">
            <ChatPanel className="h-[420px] sm:h-[480px] lg:h-[560px] xl:h-[620px]" />

            <div className="panel p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <Settings2 size={17} className="text-accent-2" /> Game settings
                </h2>
                {isHost ? (
                  <span className="chip border-accent/25 bg-accent/10 text-accent">Host</span>
                ) : (
                  <span className="chip">
                    <Lock size={10} /> Host only
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <SettingRow label="Difficulty">
                  {isHost ? (
                    <select
                      className="input h-9 w-32 py-0 text-sm"
                      value={state.settings.difficulty}
                      onChange={(event) =>
                        updateSettings({ difficulty: event.target.value as RoomSettings['difficulty'] })
                      }
                    >
                      <option value="easy">Easy</option>
                      <option value="mixed">Mixed</option>
                      <option value="hard">Hard</option>
                    </select>
                  ) : (
                    <span className="text-sm capitalize text-muted">{state.settings.difficulty}</span>
                  )}
                </SettingRow>

                <SettingRow label="Rounds">
                  {isHost ? (
                    <select
                      className="input h-9 w-24 py-0 text-sm"
                      value={state.settings.rounds}
                      onChange={(event) => updateSettings({ rounds: Number(event.target.value) })}
                    >
                      {ROUND_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-muted">{state.settings.rounds}</span>
                  )}
                </SettingRow>

                <SettingRow label="Draw time">
                  {isHost ? (
                    <select
                      className="input h-9 w-24 py-0 text-sm"
                      value={state.settings.drawTime}
                      onChange={(event) => updateSettings({ drawTime: Number(event.target.value) })}
                    >
                      {TIME_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value}s
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-muted">{state.settings.drawTime}s</span>
                  )}
                </SettingRow>

                <SettingRow label="Max players">
                  {isHost ? (
                    <select
                      className="input h-9 w-24 py-0 text-sm"
                      value={state.settings.maxPlayers}
                      onChange={(event) => updateSettings({ maxPlayers: Number(event.target.value) })}
                    >
                      {MAX_PLAYER_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-muted">{state.settings.maxPlayers}</span>
                  )}
                </SettingRow>

                <SettingRow label="Hints">
                  {isHost ? (
                    <select
                      className="input h-9 w-20 py-0 text-sm"
                      value={state.settings.hints}
                      onChange={(event) => updateSettings({ hints: Number(event.target.value) })}
                    >
                      {HINT_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-muted">{state.settings.hints}</span>
                  )}
                </SettingRow>

                <div className="flex items-center justify-between gap-3 border-t border-white/6 pt-3">
                  <div>
                    <p className="text-sm font-medium">Custom words</p>
                    <p className="text-[11px] text-muted">
                      {customCount ? `${customCount} added` : 'Add your own inside jokes'}
                    </p>
                  </div>
                  {isHost ? (
                    <button
                      type="button"
                      className="btn btn-ghost h-8 px-3 text-xs"
                      onClick={() => {
                        setCustomText(state.settings.customWords.join('\n'));
                        setWordsOpen(true);
                      }}
                    >
                      Edit
                    </button>
                  ) : (
                    <span className="text-sm text-muted">{customCount || '—'}</span>
                  )}
                </div>

                {isHost ? (
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition',
                      state.settings.locked
                        ? 'border-danger/25 bg-danger/8'
                        : 'border-white/8 bg-white/3 hover:bg-white/6',
                    )}
                    onClick={() => updateSettings({ locked: !state.settings.locked })}
                  >
                    <span className="flex items-center gap-2 text-sm">
                      {state.settings.locked ? <Lock size={14} className="text-danger" /> : <Unlock size={14} className="text-lime" />}
                      {state.settings.locked ? 'Room locked' : 'Room open'}
                    </span>
                    <span
                      className={cn(
                        'relative h-5 w-9 rounded-full transition',
                        state.settings.locked ? 'bg-danger/60' : 'bg-white/15',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 h-4 w-4 rounded-full bg-white transition',
                          state.settings.locked ? 'left-[18px]' : 'left-0.5',
                        )}
                      />
                    </span>
                  </button>
                ) : null}
              </div>
            </div>

          </aside>
        </div>
      </main>

      {isHost ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-night/90 p-3 backdrop-blur-xl lg:hidden">
          <button type="button" className="btn btn-primary w-full py-3" disabled={!canStart} onClick={startGame}>
            <Play size={17} /> {canStart ? 'Start game' : 'Need 2+ players'}
          </button>
        </div>
      ) : null}

      <Modal
        open={qrOpen}
        onOpenChange={setQrOpen}
        title="Invite players"
        description="Scan the code or send the link. This room is private."
      >
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-white p-4">
            <QRCodeSVG value={inviteUrl || code} size={190} bgColor="#ffffff" fgColor="#0b0e14" level="M" />
          </div>
          <div className="w-full rounded-xl border border-white/8 bg-black/25 px-3 py-2 text-center font-mono text-xs text-muted">
            {inviteUrl || `Room code ${code}`}
          </div>
          <div className="flex w-full gap-2">
            <button type="button" className="btn btn-ghost flex-1" onClick={copyLink}>
              <Copy size={15} /> Copy link
            </button>
            {canNativeShare ? (
              <button type="button" className="btn btn-primary flex-1" onClick={share}>
                <Share2 size={15} /> Share
              </button>
            ) : null}
          </div>
        </div>
      </Modal>

      <Modal
        open={wordsOpen}
        onOpenChange={setWordsOpen}
        title="Custom words"
        description="One word or phrase per line (commas work too). Max 200 words, 30 characters each."
      >
        <textarea
          className="input min-h-[200px] resize-y font-mono text-sm leading-relaxed"
          value={customText}
          onChange={(event) => setCustomText(event.target.value)}
          placeholder={'inside joke\nschool mascot\nfavourite snack'}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-muted">
            {customText
              .split(/[\n,]/)
              .map((word) => word.trim())
              .filter(Boolean).length}{' '}
            words
          </span>
          <button type="button" className="btn btn-primary" onClick={saveCustomWords}>
            <Check size={15} /> Save words
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={
          pending?.kind === 'kick'
            ? `Remove ${pending.nickname}?`
            : pending?.kind === 'host'
              ? `Make ${pending.nickname} host?`
              : 'Leave the room?'
        }
        description={
          pending?.kind === 'kick'
            ? `${pending.nickname} will be removed from the room. They can rejoin with the room code.`
            : pending?.kind === 'host'
              ? 'They will be able to change settings and start the next game.'
              : 'Your seat will be given up. You can rejoin with the room code.'
        }
        confirmLabel={
          pending?.kind === 'kick' ? 'Remove player' : pending?.kind === 'host' ? 'Make host' : 'Leave room'
        }
        destructive={pending?.kind !== 'host'}
        onConfirm={confirmPending}
      />

      {/* Reactions float over the lobby so the chat reaction row is live here too. */}
      <div className="pointer-events-none fixed inset-0 z-30">
        <ReactionLayer />
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/6 bg-black/20 px-2 py-2">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted">
        {icon}
        {label}
      </div>
      <p className="mt-1 font-display text-base font-bold">{value}</p>
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted">{label}</span>
      {children}
    </div>
  );
}
