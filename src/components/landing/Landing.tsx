'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Dices,
  History,
  Keyboard,
  LogIn,
  MousePointerClick,
  PenLine,
  Plus,
  Share2,
  Sparkles,
  Trophy,
  Users,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { randomAvatarSeed } from '@/components/Avatar';
import { AvatarPicker } from '@/components/AvatarPicker';
import { BrandMark, Wordmark } from '@/components/BrandMark';
import { HowToPlayDialog } from '@/components/HowToPlayDialog';
import { getSocket } from '@/lib/socket';
import { getAvatarSeed, getNickname, getWins, saveAvatarSeed, saveNickname, saveSession } from '@/lib/session';
import { cosmeticForWins } from '@/lib/game-config';
import { clearRecentRooms, forgetRoom, getRecentRooms, timeAgo, type RecentRoom } from '@/lib/recent-rooms';
import { useGameStore } from '@/lib/store';
import { sfx } from '@/lib/sound';
import type { Ack } from '@/lib/types';
import type { RoomCreatedData } from '@/lib/socket-events';
import { BRAND } from '@/lib/brand';

type Mode = 'create' | 'join';

function extractRoomCode(raw: string): string {
  const fromUrl = raw.match(/\/room\/([a-z0-9]{4,8})/i);
  if (fromUrl) return fromUrl[1].toUpperCase();
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

function connectSocket(): Promise<void> {
  const socket = getSocket();
  if (socket.connected) return Promise.resolve();
  socket.connect();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Connection timed out'));
    }, 10_000);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
    };
    const onConnect = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Could not connect'));
    };

    socket.once('connect', onConnect);
    socket.once('connect_error', onError);
  });
}

const features = [
  {
    icon: <Zap size={18} />,
    title: 'Sub-100ms strokes',
    text: 'A batched, normalized stroke pipeline makes drawing feel local, even with 16 players in the room.',
  },
  {
    icon: <Share2 size={18} />,
    title: 'One code, everyone in',
    text: 'Create a room and drop the 6-character code. No accounts, no installs, no waiting room.',
  },
  {
    icon: <Wifi size={18} />,
    title: 'Refresh-proof',
    text: 'Lost connection mid-drawing? Reconnect and land back in your seat with the canvas intact.',
  },
  {
    icon: <Trophy size={18} />,
    title: 'Actually competitive',
    text: 'Speed scoring, guess streaks, hint penalties and difficulty multipliers. Every round matters.',
  },
];

const howItWorks = [
  {
    icon: <Plus size={18} />,
    title: 'Create a room',
    text: 'Pick a nickname and a room is yours. Share the code with your friends.',
  },
  {
    icon: <MousePointerClick size={18} />,
    title: 'Draw & guess',
    text: 'Take turns sketching secretly while everyone else races to guess in chat.',
  },
  {
    icon: <Sparkles size={18} />,
    title: 'Crown a winner',
    text: 'Three rounds later, the podium decides who has bragging rights.',
  },
];

export function Landing() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('create');
  const [nickname, setNickname] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('orbit');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [recent, setRecent] = useState<RecentRoom[]>([]);
  const joinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNickname(getNickname());
    setAvatarSeed(getAvatarSeed() || randomAvatarSeed());
    setRecent(getRecentRooms());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (mode !== 'join') return;
    const timer = window.setTimeout(() => joinInputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [mode]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch('/api/health', { cache: 'no-store' });
        if (!response.ok) return;
        const data = (await response.json()) as { players?: number };
        if (!cancelled) setOnline(typeof data.players === 'number' ? data.players : 0);
      } catch {
        if (!cancelled) setOnline(null);
      }
    };

    void load();
    const interval = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const persistIdentity = (name: string) => {
    saveNickname(name);
    saveAvatarSeed(avatarSeed);
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const name = nickname.trim();

    if (name.length < 2) {
      setError('Nickname needs at least 2 characters.');
      return;
    }
    if (name.length > 16) {
      setError('Keep your nickname under 16 characters.');
      return;
    }

    setBusy(true);
    sfx.start();
    persistIdentity(name);

    try {
      await connectSocket();

      const existing = useGameStore.getState().state;
      if (existing) {
        await new Promise<void>((resolve) => {
          getSocket().emit('room:leave', () => resolve());
        });
        useGameStore.getState().resetRoom();
      }

      const result = await new Promise<Ack<RoomCreatedData>>((resolve) => {
        getSocket().emit(
          'room:create',
          { nickname: name, avatarSeed, cosmetic: cosmeticForWins(getWins()) ?? undefined },
          resolve,
        );
      });

      if (!result.ok || !result.data) {
        setError(result.ok ? 'Room could not be created.' : result.error);
        return;
      }

      saveSession(result.data.code, {
        playerId: result.data.playerId,
        token: result.data.token,
      });
      router.push(`/room/${result.data.code}`);
    } catch {
      setError('Could not reach the game server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const name = nickname.trim();
    const code = extractRoomCode(joinCode);

    if (name.length < 2) {
      setError('Nickname needs at least 2 characters.');
      return;
    }
    if (code.length < 4) {
      setError('Enter the 6-character room code.');
      return;
    }

    sfx.click();
    persistIdentity(name);
    router.push(`/room/${code}`);
  };

  const rejoin = (code: string) => {
    const name = nickname.trim();
    if (name.length >= 2 && name.length <= 16) persistIdentity(name);
    sfx.click();
    router.push(`/room/${code}`);
  };

  const handleCodePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const extracted = extractRoomCode(event.clipboardData.getData('text'));
    if (!extracted) return;
    event.preventDefault();
    setJoinCode(extracted);
    setError('');
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    sfx.click();
  };

  return (
    <div className="min-h-dvh overflow-x-hidden">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <Wordmark />
        </div>
        <div className="flex items-center gap-2">
          <HowToPlayDialog
            trigger={
              <button className="btn btn-ghost hidden sm:inline-flex" type="button">
                How to play
              </button>
            }
          />
          <a href="#play" className="btn btn-primary" onClick={() => sfx.click()}>
            Play now <ArrowRight size={16} />
          </a>
        </div>
      </header>

      <main>
        <section className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:pb-24 lg:pt-16">
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-xs font-medium text-muted"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
              </span>
              Free · No signup · 2–16 players
              {online !== null ? (
                <span className="ml-1 border-l border-white/10 pl-2 text-ink/80">
                  {online > 0 ? `${online} playing now` : 'Be the first in'}
                </span>
              ) : null}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="font-display text-balance text-5xl font-bold leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl"
            >
              Draw badly.
              <br />
              Guess{' '}
              <span className="bg-gradient-to-r from-lime via-accent-2 to-accent bg-clip-text text-transparent">
                brilliantly.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12 }}
              className="mt-5 max-w-xl text-balance text-base leading-relaxed text-muted sm:text-lg"
            >
              {BRAND.name} is the multiplayer drawing game for game nights, classrooms and group chats. Create a room,
              share the code, and find out who really knows what a &ldquo;platypus&rdquo; looks like.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18 }}
              className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted"
            >
              <span className="flex items-center gap-1.5">
                <Users size={15} className="text-accent-2" /> Up to 16 players
              </span>
              <span className="flex items-center gap-1.5">
                <PenLine size={15} className="text-accent-2" /> Pen, shapes, fill
              </span>
              <span className="flex items-center gap-1.5">
                <Keyboard size={15} className="text-accent-2" /> Desktop + mobile
              </span>
            </motion.div>

            <div className="pointer-events-none absolute -left-10 top-1/2 hidden -translate-y-1/2 xl:block">
              <div className="animate-float rounded-2xl border border-white/10 bg-surface/80 px-3 py-2 text-xs font-semibold text-muted shadow-2xl">
                pizza 🍕
              </div>
            </div>
            <div className="pointer-events-none absolute -right-2 top-20 hidden xl:block">
              <div className="animate-float-slow rounded-2xl border border-white/10 bg-surface/80 px-3 py-2 text-xs font-semibold text-muted shadow-2xl">
                rocket 🚀
              </div>
            </div>
          </div>

          <motion.div
            id="play"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative z-10 scroll-mt-24"
          >
            <div className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-accent/20 via-transparent to-accent-2/20 blur-3xl" />
            <div className="panel relative p-2">
              <div className="rounded-[1.25rem] bg-night/70 p-5 sm:p-6">
                <div className="mb-5 flex rounded-xl border border-white/8 bg-black/20 p-1">
                  <button
                    type="button"
                    onClick={() => switchMode('create')}
                    aria-pressed={mode === 'create'}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      mode === 'create' ? 'bg-white/10 text-ink shadow-sm' : 'text-muted hover:text-ink'
                    }`}
                  >
                    <Plus size={14} className="mr-1.5 inline" /> Create room
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('join')}
                    aria-pressed={mode === 'join'}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      mode === 'join' ? 'bg-white/10 text-ink shadow-sm' : 'text-muted hover:text-ink'
                    }`}
                  >
                    <LogIn size={14} className="mr-1.5 inline" /> Join room
                  </button>
                </div>

                <form onSubmit={mode === 'create' ? handleCreate : handleJoin} className="space-y-4">
                  <div>
                    <label className="label" htmlFor="nickname">
                      Your nickname
                    </label>
                    <div className="flex items-center gap-2">
                      <AvatarPicker seed={avatarSeed} name={nickname || 'You'} onChange={setAvatarSeed} />
                      <input
                        id="nickname"
                        className="input"
                        placeholder="e.g. doodlebandit"
                        value={nickname}
                        maxLength={16}
                        autoComplete="off"
                        onChange={(event) => setNickname(event.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost h-[46px] w-[46px] shrink-0 p-0"
                        title="Randomize avatar"
                        aria-label="Randomize avatar"
                        onClick={() => {
                          setAvatarSeed(randomAvatarSeed());
                          sfx.click();
                        }}
                      >
                        <Dices size={18} />
                      </button>
                    </div>
                  </div>

                  {mode === 'create' ? (
                    <div className="rounded-xl border border-white/6 bg-white/3 p-3 text-xs leading-relaxed text-muted">
                      You&apos;ll get a 6-character code. Share it — everyone with the code can join instantly.
                    </div>
                  ) : (
                    <div>
                      <label className="label" htmlFor="room-code">
                        Room code
                      </label>
                      <input
                        id="room-code"
                        ref={joinInputRef}
                        className="input text-center font-display text-xl font-bold uppercase tracking-[0.35em]"
                        placeholder="A7K2Q9"
                        value={joinCode}
                        maxLength={8}
                        autoComplete="off"
                        spellCheck={false}
                        onChange={(event) => setJoinCode(extractRoomCode(event.target.value))}
                        onPaste={handleCodePaste}
                      />
                      <p className="mt-1.5 text-center text-[10px] text-muted">
                        Tip: pasting a full invite link works too.
                      </p>
                    </div>
                  )}

                  {error ? (
                    <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                      {error}
                    </p>
                  ) : null}

                  <button type="submit" className="btn btn-primary w-full py-3 text-base" disabled={busy || !hydrated}>
                    {busy ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                        Creating room…
                      </>
                    ) : mode === 'create' ? (
                      <>
                        Create room <ArrowRight size={18} />
                      </>
                    ) : (
                      <>
                        Join the fun <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>

                {recent.length > 0 ? (
                  <div className="mt-4 border-t border-white/8 pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted">
                        <History size={12} /> Jump back in
                      </p>
                      <button
                        type="button"
                        className="rounded-md px-1.5 py-0.5 text-[10.5px] font-medium text-muted transition hover:bg-white/6 hover:text-danger"
                        onClick={() => {
                          clearRecentRooms();
                          setRecent([]);
                        }}
                      >
                        Clear
                      </button>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {recent.map((room) => (
                        <div
                          key={room.code}
                          className="group flex items-center gap-1 rounded-xl border border-white/6 bg-white/3 p-1 transition hover:border-accent/25 hover:bg-accent/5"
                        >
                          <button
                            type="button"
                            onClick={() => rejoin(room.code)}
                            className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2 text-left"
                          >
                            <span className="shrink-0 rounded-lg border border-white/8 bg-black/25 px-2.5 py-1.5 font-display text-xs font-bold tracking-[0.18em] text-lime">
                              {room.code}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-medium text-ink">
                                {room.nickname ? `Played as ${room.nickname}` : 'Rejoin room'}
                              </span>
                              <span className="block text-[10.5px] text-muted">{timeAgo(room.at)}</span>
                            </span>
                            <ArrowRight
                              size={14}
                              className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-lime"
                            />
                          </button>
                          <button
                            type="button"
                            aria-label={`Forget room ${room.code}`}
                            className="rounded-md p-2 text-muted transition hover:bg-white/8 hover:text-danger"
                            onClick={() => {
                              forgetRoom(room.code);
                              setRecent(getRecentRooms());
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
                  No account. No download. Just a link and questionable art skills.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 pb-20 sm:px-8">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-2">How it works</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                From zero to chaos in 30 seconds.
              </h2>
            </div>
            <HowToPlayDialog
              trigger={
                <button type="button" className="btn btn-ghost self-start sm:self-auto">
                  Full rules
                </button>
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {howItWorks.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: index * 0.07 }}
                className="panel grain relative overflow-hidden p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent-2">
                  {item.icon}
                </div>
                <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.text}</p>
                <span className="pointer-events-none absolute right-5 top-4 font-display text-4xl font-bold text-white/5">
                  0{index + 1}
                </span>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 pb-20 sm:px-8">
          <div className="panel grain relative overflow-hidden p-6 sm:p-10">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-accent-2/10 blur-3xl" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime">Why it feels better</p>
              <h2 className="mt-2 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Built for the moment the timer hits ten seconds.
              </h2>
              <div className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2">
                {features.map((feature) => (
                  <div key={feature.title} className="flex gap-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/4 text-lime">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{feature.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{feature.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-4xl px-5 pb-24 text-center sm:px-8">
          <h2 className="font-display text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            Your friends are already drawing without you.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Create a room, send one code, and let the arguing begin. It takes less time than picking a movie.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a href="#play" className="btn btn-primary px-6 py-3 text-base" onClick={() => sfx.click()}>
              Start a room <ArrowRight size={18} />
            </a>
            <HowToPlayDialog
              trigger={
                <button type="button" className="btn btn-ghost px-6 py-3 text-base">
                  Read the rules
                </button>
              }
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-white/6">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-muted sm:flex-row sm:px-8">
          <div className="flex items-center gap-2">
            <BrandMark size={22} />
            <span>
              <Wordmark className="text-sm" /> — {BRAND.tagline}
            </span>
          </div>
          <p>No accounts. No downloads. Just drawing.</p>
        </div>
      </footer>
    </div>
  );
}
