'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { PlayerRail } from './PlayerRail';
import { TopBar } from './TopBar';
import { WordBanner } from './WordBanner';
import { CanvasStage } from './CanvasStage';
import { ChatPanel } from './ChatPanel';
import { ReactionRow } from './ReactionRow';
import { WordChooser } from './WordChooser';
import { RoundEndOverlay } from './RoundEndOverlay';
import { GameEndOverlay } from './GameEndOverlay';
import { useGameStore } from '@/lib/store';
import { sfx } from '@/lib/sound';

export function Game() {
  const state = useGameStore((store) => store.state);
  const chat = useGameStore((store) => store.chat);
  const [chatOpen, setChatOpen] = useState(false);
  const [seenCount, setSeenCount] = useState(0);
  const previousPhase = useRef(state?.phase ?? 'lobby');
  const lastChatId = useRef<string | null>(null);

  useEffect(() => {
    setSeenCount(useGameStore.getState().chat.length);
  }, []);

  useEffect(() => {
    if (!state) return;
    if (previousPhase.current === state.phase) return;

    if (state.phase === 'drawing') sfx.start();
    previousPhase.current = state.phase;
  }, [state]);

  useEffect(() => {
    const last = chat[chat.length - 1];
    if (!last || last.id === lastChatId.current) return;
    lastChatId.current = last.id;
    if (last.kind === 'correct' && last.playerId === state?.you.id) {
      sfx.correct();
    }
  }, [chat, state?.you.id]);

  useEffect(() => {
    if (!chatOpen) return;
    setSeenCount(useGameStore.getState().chat.length);
  }, [chatOpen, chat.length]);

  useEffect(() => {
    if (!chatOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setChatOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chatOpen]);

  if (!state) return null;

  const unread = chatOpen ? 0 : Math.max(0, chat.length - seenCount);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar />
      <PlayerRail variant="mobile" />

      <div className="flex min-h-0 flex-1">
        <PlayerRail className="lg:w-[228px] xl:w-[252px]" />

        <main className="flex min-w-0 flex-1 flex-col gap-2 p-2 sm:p-2.5">
          <div className="lg:hidden">
            <WordBanner />
          </div>
          <CanvasStage />
        </main>

        <aside className="hidden w-[288px] shrink-0 border-l border-white/6 bg-black/10 p-2.5 lg:block 2xl:w-[320px]">
          <ChatPanel className="h-full" />
        </aside>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-white/8 bg-night/85 px-2 py-2 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          className="btn btn-ghost h-10 flex-1 justify-between"
          onClick={() => setChatOpen(true)}
        >
          <span className="flex items-center gap-2">
            <MessageCircle size={16} className="text-accent-2" />
            Chat &amp; guesses
          </span>
          {unread > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-lime px-1.5 text-[10px] font-bold text-black">
              {unread > 99 ? '99+' : unread}
            </span>
          ) : (
            <span className="text-[10px] text-muted">
              {state.phase === 'drawing' ? 'Guess here' : 'Open'}
            </span>
          )}
        </button>
        <ReactionRow
          className="fade-x no-scrollbar min-w-0 flex-1 flex-nowrap justify-start overflow-x-auto"
          size="md"
        />
      </div>

      {chatOpen ? (
        <div data-testid="chat-drawer" className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setChatOpen(false)}
            aria-label="Close chat"
          />
          <div className="absolute inset-x-0 bottom-0 flex h-[74dvh] flex-col rounded-t-3xl border-t border-white/10 bg-night p-2 shadow-2xl animate-rise">
            <ChatPanel className="h-full" onClose={() => setChatOpen(false)} />
          </div>
        </div>
      ) : null}

      <WordChooser />
      <RoundEndOverlay />
      <GameEndOverlay />
    </div>
  );
}
