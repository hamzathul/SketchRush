'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Dices, Loader2, Lock, Users } from 'lucide-react';

import { randomAvatarSeed } from '@/components/Avatar';
import { AvatarPicker } from '@/components/AvatarPicker';
import { getSocket } from '@/lib/socket';
import { getAvatarSeed, getNickname, saveAvatarSeed, saveNickname, saveSession } from '@/lib/session';
import type { Ack } from '@/lib/types';
import type { RoomCreatedData } from '@/lib/socket-events';
import { sfx } from '@/lib/sound';

interface JoinGateProps {
  code: string;
  onJoined: () => void;
}

export function JoinGate({ code, onJoined }: JoinGateProps) {
  const [nickname, setNickname] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('orbit');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setNickname(getNickname());
    setAvatarSeed(getAvatarSeed() || randomAvatarSeed());
    setHydrated(true);
  }, []);

  const handleJoin = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const name = nickname.trim();

    if (name.length < 2) {
      setError('Pick a nickname with at least 2 characters.');
      return;
    }

    setBusy(true);
    saveNickname(name);
    saveAvatarSeed(avatarSeed);
    sfx.click();

    getSocket().emit('room:join', { code, nickname: name, avatarSeed }, (result: Ack<RoomCreatedData>) => {
      setBusy(false);
      if (!result.ok || !result.data) {
        setError(result.ok ? 'Could not join the room.' : result.error);
        return;
      }
      saveSession(code, { playerId: result.data.playerId, token: result.data.token });
      onJoined();
    });
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-5 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-xs text-muted">
          <Users size={13} /> Joining room
          <span className="rounded-md bg-white/8 px-2 py-0.5 font-display text-sm font-bold tracking-[0.2em] text-ink">
            {code}
          </span>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">You&apos;re almost in.</h1>
        <p className="mt-2 text-sm text-muted">Pick a name your friends will recognize.</p>
      </div>

      <form onSubmit={handleJoin} className="panel space-y-4 p-6">
        <div>
          <label className="label" htmlFor="join-nickname">
            Your nickname
          </label>
          <div className="flex items-center gap-2">
            <AvatarPicker seed={avatarSeed} name={nickname || 'You'} onChange={setAvatarSeed} />
            <input
              id="join-nickname"
              className="input"
              placeholder="e.g. doodlebandit"
              value={nickname}
              maxLength={16}
              autoComplete="off"
              autoFocus
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

        {error ? (
          <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        ) : null}

        <button type="submit" className="btn btn-primary w-full py-3" disabled={busy || !hydrated}>
          {busy ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Joining…
            </>
          ) : (
            <>
              Join room <ArrowRight size={17} />
            </>
          )}
        </button>

        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted">
          <Lock size={11} /> Only people with room {code} can join.
        </p>
      </form>

      <div className="mt-5 flex items-center justify-between text-xs text-muted">
        <Link href="/" className="transition hover:text-ink">
          ← Back home
        </Link>
        <span className="text-muted/70">Ask the host for the code if this one is wrong.</span>
      </div>
    </div>
  );
}
