'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '@/components/Avatar';
import { ReactionRow } from '@/components/game/ReactionRow';
import { QUICK_LINES_ARTIST, QUICK_LINES_DRAWING, QUICK_LINES_IDLE } from '@/lib/game-config';
import { useGameStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import { cn } from '@/lib/cn';

export function ChatPanel({
  className = '',
  onClose,
}: {
  className?: string;
  onClose?: () => void;
}) {
  const state = useGameStore((store) => store.state);
  const chat = useGameStore((store) => store.chat);
  const connected = useGameStore((store) => store.connected);
  const [value, setValue] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = listRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [chat.length]);

  if (!state) return null;

  const playerById = new Map(state.players.map((player) => [player.id, player]));
  const isArtist = state.you.isArtist;
  const hasGuessed = state.guessedIds.includes(state.you.id);
  const drawing = state.phase === 'drawing';
  const quickLines =
    drawing && isArtist
      ? QUICK_LINES_ARTIST
      : drawing && !hasGuessed
        ? QUICK_LINES_DRAWING
        : QUICK_LINES_IDLE;

  let placeholder = 'Message the room…';
  if (!connected) placeholder = 'Reconnecting…';
  else if (drawing && isArtist) placeholder = "Chat — but don't say the word";
  else if (drawing && hasGuessed) placeholder = 'You got it! Cheer the others on…';
  else if (drawing && !state.you.isSpectator) placeholder = 'Type your guess…';
  else if (state.phase === 'round_end' || state.phase === 'game_end') placeholder = 'Say gg…';

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = value.trim();
    if (!text) return;
    if (!connected) {
      toast.error('Still reconnecting — try again in a second.');
      return;
    }
    getSocket().emit('chat:send', { text });
    setValue('');
  };

  /** One-tap banter: these never count as guesses. */
  const sendQuick = (line: string) => {
    if (!connected) {
      toast.error('Still reconnecting — try again in a second.');
      return;
    }
    getSocket().emit('chat:send', { text: line, quick: true });
  };

  return (
    <div className={cn('panel flex min-h-0 flex-col overflow-hidden', className)}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/6 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <MessageCircle size={15} className="text-accent-2" />
          <p className="text-sm font-semibold">Chat & guesses</p>
          {drawing && !isArtist && !hasGuessed ? (
            <span className="hidden items-center gap-1 rounded-full bg-lime/10 px-2 py-0.5 text-[10px] font-medium text-lime sm:flex">
              <Sparkles size={9} /> guessing
            </span>
          ) : null}
        </div>
        {onClose ? (
          <button
            type="button"
            className="rounded-lg p-1.5 text-muted transition hover:bg-white/10 hover:text-ink"
            onClick={onClose}
            aria-label="Close chat"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      <div ref={listRef} data-testid="chat-list" className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3" aria-live="polite">
        {chat.length === 0 ? (
          <p className="mt-6 text-center text-xs leading-relaxed text-muted">
            No messages yet.
            <br />
            {drawing ? 'Be the first to guess!' : 'Say hi while you wait.'}
          </p>
        ) : null}

        {chat.map((message) => {
          if (message.kind === 'system') {
            return (
              <p key={message.id} className="py-0.5 text-center text-[10.5px] leading-relaxed text-muted/80">
                {message.text}
              </p>
            );
          }

          if (message.kind === 'correct') {
            return (
              <div
                key={message.id}
                className="flex items-center gap-1.5 rounded-lg border border-lime/25 bg-lime/10 px-2.5 py-1.5 text-[11.5px] font-medium text-lime"
              >
                <Check size={12} className="shrink-0" />
                <span className="truncate">{message.text}</span>
              </div>
            );
          }

          const player = message.playerId ? playerById.get(message.playerId) : undefined;
          const isMine = message.playerId === state.you.id;

          return (
            <div key={message.id} className={cn('flex items-end gap-2', isMine && 'flex-row-reverse')}>
              {player ? (
                <Avatar
                  seed={player.avatarSeed}
                  name={player.nickname}
                  size={24}
                  className="mb-0.5 shrink-0 rounded-md"
                  cosmetic={player.cosmetic}
                />
              ) : (
                <div className="mb-0.5 h-6 w-6 shrink-0 rounded-md bg-white/10" />
              )}
              <div className={cn('min-w-0 max-w-[82%]', isMine && 'text-right')}>
                <p className="text-[11px] font-semibold text-muted">
                  {message.nickname}
                  {isMine ? <span className="ml-1 text-[9px] text-muted/70">you</span> : null}
                </p>
                <p
                  className={cn(
                    'mt-0.5 inline-block break-words rounded-2xl border px-2.5 py-1.5 text-left text-[13px] leading-snug text-ink',
                    isMine
                      ? 'rounded-br-md border-accent/25 bg-accent/15'
                      : 'rounded-bl-md border-white/8 bg-white/6',
                  )}
                >
                  {message.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-white/6 px-2.5 py-2">
        <div
          data-testid="quick-chat-row"
          className="fade-x no-scrollbar mb-1.5 flex flex-nowrap items-center gap-1 overflow-x-auto"
        >
          {quickLines.map((line) => (
            <button
              key={line}
              type="button"
              className="shrink-0 rounded-full border border-white/8 bg-white/4 px-2 py-1 text-[11px] text-muted transition hover:bg-white/10 hover:text-ink disabled:opacity-50"
              onClick={() => sendQuick(line)}
              disabled={!connected}
            >
              {line}
            </button>
          ))}
        </div>
        <ReactionRow className="mb-1.5" />
        <form onSubmit={send} className="flex items-center gap-1.5">
          <input
            className="input h-10 flex-1 border-white/8 bg-white/4 px-3 text-[13px]"
            placeholder={placeholder}
            value={value}
            maxLength={200}
            autoComplete="off"
            disabled={!connected}
            onChange={(event) => setValue(event.target.value)}
            aria-label={placeholder}
          />
          <button
            type="submit"
            className="btn btn-accent h-10 w-10 shrink-0 p-0"
            disabled={!connected || !value.trim()}
            aria-label="Send message"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
