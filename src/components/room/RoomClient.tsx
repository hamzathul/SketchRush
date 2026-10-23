'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Loader2, WifiOff } from 'lucide-react';
import { BrandMark, Wordmark } from '@/components/BrandMark';
import { JoinGate } from '@/components/room/JoinGate';
import { Lobby } from '@/components/room/Lobby';
import { Game } from '@/components/game/Game';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/lib/store';
import { clearSession, loadSession } from '@/lib/session';
import { rememberRoom } from '@/lib/recent-rooms';
import { sfx } from '@/lib/sound';

interface RoomClientProps {
  code: string;
}

type Status = 'loading' | 'gate' | 'ready' | 'ended';

export function RoomClient({ code }: RoomClientProps) {
  const state = useGameStore((store) => store.state);
  const connected = useGameStore((store) => store.connected);
  const epoch = useGameStore((store) => store.connectionEpoch);
  const endedReason = useGameStore((store) => store.endedReason);
  const resetRoom = useGameStore((store) => store.resetRoom);

  const [status, setStatus] = useState<Status>('loading');
  const attemptedEpoch = useRef<number | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();
  }, []);

  useEffect(() => {
    if (!connected) return;
    if (attemptedEpoch.current === epoch) return;
    attemptedEpoch.current = epoch;

    const socket = getSocket();
    const current = useGameStore.getState();
    if (current.state && current.state.code !== code) {
      socket.emit('room:leave', () => undefined);
      resetRoom();
    }

    const session = loadSession(code);
    if (!session) {
      if (useGameStore.getState().state?.code === code) setStatus('ready');
      else setStatus('gate');
      return;
    }

    setStatus('loading');
    socket.emit('room:resume', { code, ...session }, (result) => {
      if (result.ok) {
        setStatus('ready');
        sfx.join();
      } else {
        clearSession(code);
        setStatus('gate');
      }
    });
  }, [connected, epoch, code, resetRoom]);

  useEffect(() => {
    if (endedReason) setStatus('ended');
  }, [endedReason]);

  const me = state?.players.find((player) => player.id === state.you.id);

  // Keep a tiny rejoin list on this device. It updates only when the room or
  // nickname changes, not on every score tick.
  useEffect(() => {
    if (state?.code === code) rememberRoom(code, me?.nickname);
  }, [code, state?.code, me?.nickname]);

  const handleJoined = () => {
    setStatus('ready');
    sfx.join();
  };

  if (status === 'ended' || endedReason) {
    return (
      <Shell>
        <div className="panel w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/15 text-danger">
            <WifiOff size={22} />
          </div>
          <h1 className="font-display text-2xl font-bold">Room closed</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {endedReason ?? 'This room is no longer available.'}
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link href="/" className="btn btn-primary flex-1">
              Back home
            </Link>
            <button
              type="button"
              className="btn btn-ghost flex-1"
              onClick={() => {
                resetRoom();
                window.location.reload();
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (status === 'gate') {
    return (
      <Shell>
        <JoinGate code={code} onJoined={handleJoined} />
      </Shell>
    );
  }

  if (status === 'loading' || !state) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 text-center">
          <BrandMark size={52} />
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 size={15} className="animate-spin" />
            {connected ? 'Joining room…' : 'Connecting to the game server…'}
          </div>
          <Link href="/" className="btn btn-ghost mt-2">
            <ArrowLeft size={15} /> Back home
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <>
      {state.phase === 'lobby' ? <Lobby /> : <Game />}
      <AnimatePresence>
        {!connected ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-night/80 backdrop-blur-md"
          >
            <div className="panel flex max-w-sm flex-col items-center gap-3 p-8 text-center">
              <Loader2 size={26} className="animate-spin text-accent-2" />
              <h2 className="font-display text-xl font-bold">Reconnecting…</h2>
              <p className="text-sm text-muted">
                Your seat is saved. Hold tight while we get you back into room {code}.
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain relative flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-10">
      <Link href="/" className="flex items-center gap-2.5">
        <BrandMark />
        <Wordmark />
      </Link>
      {children}
    </div>
  );
}
