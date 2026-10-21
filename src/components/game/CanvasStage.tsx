'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useGameStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import { clamp, TIMING } from '@/lib/game-config';
import type { Point, Stroke, Tool } from '@/lib/types';
import { useServerNow } from '@/lib/use-server-now';
import { cn } from '@/lib/cn';
import { CanvasEngine } from './canvas-engine';
import { ReactionLayer } from './ReactionLayer';
import { ReactionRow } from './ReactionRow';
import { Toolbar, type UiTool } from './Toolbar';

interface ActiveStroke {
  id: string;
  stroke: Stroke;
  pending: Point[];
  lastFlush: number;
}

// A single landscape drawing surface for every client. Keeping the aspect fixed
// prevents circles on a desktop from turning into ovals on a phone.
const CANVAS_ASPECT = 4 / 3;

export function CanvasStage() {
  const state = useGameStore((store) => store.state);
  const revision = useGameStore((store) => store.canvas.revision);
  const [tool, setTool] = useState<UiTool>('pen');
  const [color, setColor] = useState('#1f2937');
  const [sizes, setSizes] = useState<Record<Tool, number>>({
    pen: 7,
    marker: 14,
    highlighter: 22,
    eraser: 20,
  });
  const [opacity, setOpacity] = useState(1);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [focused, setFocused] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const strokeRef = useRef<ActiveStroke | null>(null);

  const size = sizes[tool === 'fill' ? 'pen' : tool];
  const canDraw = Boolean(state?.you.canDraw);

  const setSize = (next: number) => {
    const key: Tool = tool === 'fill' ? 'pen' : tool;
    setSizes((current) => ({ ...current, [key]: next }));
  };

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const measure = () => {
      const rect = wrapper.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      // Stretch across the full width first, then constrain by height.
      const width = Math.min(rect.width, rect.height * CANVAS_ASPECT);
      setBox({ width: Math.floor(width), height: Math.floor(width / CANVAS_ASPECT) });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    window.addEventListener('orientationchange', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new CanvasEngine(canvas);
    engineRef.current = engine;
    engine.sync(useGameStore.getState().canvas);
    if (box.width > 0) engine.resize(box.width, box.height);

    return () => {
      engine.destroy();
      engineRef.current = null;
      strokeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !box.width || !box.height) return;
    engine.resize(box.width, box.height);
  }, [box.width, box.height]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.sync(useGameStore.getState().canvas);
  }, [revision]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, p: 0.5 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
      p: event.pointerType === 'mouse' ? 0.5 : clamp(event.pressure || 0.5, 0.05, 1),
    };
  };

  const flush = useCallback((active: ActiveStroke, force = false) => {
    if (!active.pending.length) return;
    const now = performance.now();
    if (!force && active.pending.length < 8 && now - active.lastFlush < 45) return;

    const points = active.pending;
    active.pending = [];
    active.lastFlush = now;

    useGameStore.getState().appendActive(active.id, points);
    getSocket().emit('stroke:points', { id: active.id, points });
  }, []);

  const finishStroke = useCallback(() => {
    const active = strokeRef.current;
    if (!active) return;

    flush(active, true);
    getSocket().emit('stroke:end', { id: active.id });
    useGameStore.getState().endActive(active.id);
    strokeRef.current = null;
  }, [flush]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw || !state || !event.isPrimary) return;
    event.preventDefault();

    if (tool === 'fill') {
      const point = pointFromEvent(event);
      const dataUrl = engineRef.current?.floodFill(point.x, point.y, color);
      if (dataUrl) {
        useGameStore.getState().setSnapshot(dataUrl);
        getSocket().emit('canvas:snapshot', { dataUrl });
      }
      return;
    }

    const point = pointFromEvent(event);
    const stroke: Stroke = {
      id: crypto.randomUUID(),
      playerId: state.you.id,
      tool,
      color: tool === 'eraser' ? '#fbfbf7' : color,
      size,
      opacity: tool === 'highlighter' ? 0.35 : tool === 'eraser' ? 1 : opacity,
      points: [point],
    };

    useGameStore.getState().startActive(stroke);
    getSocket().emit('stroke:start', { stroke });
    canvasRef.current?.setPointerCapture(event.pointerId);

    strokeRef.current = { id: stroke.id, stroke, pending: [], lastFlush: performance.now() };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const active = strokeRef.current;
    if (!active) return;

    const point = pointFromEvent(event);
    const previous = active.stroke.points[active.stroke.points.length - 1];
    if (previous && Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y) < 0.0012) return;

    active.stroke.points.push(point);
    active.pending.push(point);
    flush(active);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!strokeRef.current) return;
    finishStroke();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const undo = useCallback(() => {
    if (!state || strokeRef.current) return;
    const canvas = useGameStore.getState().canvas;
    const own = [...canvas.strokes, ...canvas.active].filter((stroke) => stroke.playerId === state.you.id);
    const last = own[own.length - 1];
    if (!last) return;
    getSocket().emit('stroke:undo', { id: last.id });
  }, [state]);

  const clear = () => {
    setClearOpen(true);
  };

  const download = () => {
    const dataUrl = engineRef.current?.toDataURL();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `sketchrush-${state?.code ?? 'drawing'}.png`;
    link.click();
  };

  useEffect(() => {
    if (!focused) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFocused(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focused]);

  useEffect(() => {
    if (!canDraw) return;

    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo();
        return;
      }

      const shortcut = event.key.toLowerCase();
      const tools: Record<string, UiTool> = { b: 'pen', m: 'marker', h: 'highlighter', e: 'eraser', f: 'fill' };
      if (tools[shortcut]) {
        setTool(tools[shortcut]);
        return;
      }
      if (shortcut === '[') setSize(clamp(size - 2, 2, 48));
      if (shortcut === ']') setSize(clamp(size + 2, 2, 48));
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canDraw, undo, size, tool]);

  const canUndo = useMemo(() => {
    if (!state) return false;
    const canvas = useGameStore.getState().canvas;
    return [...canvas.strokes, ...canvas.active].some((stroke) => stroke.playerId === state.you.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, state?.you.id]);

  if (!state) return null;

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-2',
        focused && 'fixed inset-0 z-20 bg-night/97 p-2 backdrop-blur-xl sm:p-3',
      )}
    >
      {focused ? <FocusBar onExit={() => setFocused(false)} /> : null}

      <div ref={wrapperRef} className="relative flex min-h-0 flex-1 items-center justify-center">
        <div
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#fbfbf7] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
          style={
            box.width
              ? { width: box.width, height: box.height }
              : { width: '100%', aspectRatio: '4 / 3' }
          }
        >
          <canvas
            ref={canvasRef}
            className="canvas-surface block h-full w-full"
            data-tool={tool}
            aria-label="Drawing canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onLostPointerCapture={() => finishStroke()}
          />
          <ReactionLayer />

          {state.phase === 'choosing' && !state.you.isArtist ? <ChoosingOverlay /> : null}
          {state.phase === 'choosing' && state.you.isArtist && state.you.choices.length === 0 ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-night/40 backdrop-blur-[1px]">
              <div className="panel px-5 py-4 text-center">
                <Loader2 size={20} className="mx-auto mb-2 animate-spin text-accent-2" />
                <p className="text-sm text-muted">Preparing your words…</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {canDraw ? (
        <Toolbar
          tool={tool}
          onToolChange={(next) => {
            setTool(next);
          }}
          color={color}
          onColorChange={setColor}
          size={size}
          onSizeChange={setSize}
          opacity={opacity}
          onOpacityChange={setOpacity}
          canUndo={canUndo}
          onUndo={undo}
          onClear={clear}
          onDownload={download}
          focused={focused}
          onToggleFocus={() => setFocused((value) => !value)}
        />
      ) : (
        <div className="panel flex shrink-0 items-center justify-between gap-2 px-3 py-2">
          <span className="flex items-center gap-2 text-xs text-muted">
            <Eye size={14} className="text-accent-2" />
            {state.phase === 'drawing'
              ? 'Watch the drawing — type your guess in chat'
              : state.you.isSpectator
                ? 'Spectating this game — you join the next one'
                : 'Get ready for the next turn'}
          </span>
          <div className="flex items-center gap-1">
            <ReactionRow />
            <button
              type="button"
              onClick={() => setFocused((value) => !value)}
              className="btn btn-ghost h-8 gap-1.5 px-2 text-xs"
              title={focused ? 'Exit focus mode (Esc)' : 'Expand canvas'}
              aria-label={focused ? 'Exit focus mode' : 'Expand canvas'}
            >
              {focused ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span className="hidden sm:inline">{focused ? 'Exit' : 'Expand'}</span>
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Clear the canvas?"
        description="Everyone's drawing will be erased for this turn."
        confirmLabel="Clear canvas"
        destructive
        onConfirm={() => getSocket().emit('canvas:clear')}
      />
    </div>
  );
}

function FocusBar({ onExit }: { onExit: () => void }) {
  const state = useGameStore((store) => store.state);
  const now = useServerNow(250);
  if (!state) return null;

  const totalTurns = Math.max(1, state.turnOrder.length);
  const turnNumber = Math.min(totalTurns, state.turnIndex + 1);
  const seconds = state.phaseEndsAt ? Math.max(0, Math.ceil((state.phaseEndsAt - now) / 1000)) : 0;
  const artist = state.players.find((player) => player.id === state.artistId);

  const label =
    state.phase === 'drawing' ? (
      state.you.isArtist ? (
        <>
          <span className="text-muted">You&apos;re drawing</span>{' '}
          <span className="font-display text-lg font-bold text-lime">{state.you.word}</span>
        </>
      ) : (
        <>
          <span className="text-muted">Guess the word</span>{' '}
          <span className="font-display text-lg font-bold tracking-[0.18em]">
            {(state.you.maskedWord ?? '').split('').map((char, index) =>
              char === ' ' ? <span key={index} className="inline-block w-2" /> : <span key={index}>{char}</span>,
            )}
          </span>
        </>
      )
    ) : state.phase === 'choosing' ? (
      <span className="text-muted">{artist?.nickname ?? 'The artist'} is choosing a word…</span>
    ) : state.phase === 'round_end' ? (
      <span className="text-muted">
        Round over — the word was <span className="font-semibold text-lime">{state.roundResult?.word}</span>
      </span>
    ) : (
      <span className="text-muted">Game over</span>
    );

  return (
    <div className="panel flex shrink-0 items-center justify-between gap-3 px-3 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <span className="chip shrink-0">
          Turn {turnNumber}/{totalTurns}
        </span>
        <p className="min-w-0 truncate text-sm">{label}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {state.phaseEndsAt ? (
          <span className="font-display text-sm font-bold tabular-nums text-lime">{seconds}s</span>
        ) : null}
        <button
          type="button"
          onClick={onExit}
          className="btn btn-ghost h-8 gap-1.5 px-2.5 text-xs"
          title="Exit focus mode (Esc)"
        >
          <Minimize2 size={14} />
          Exit focus
        </button>
      </div>
    </div>
  );
}

function ChoosingOverlay() {
  const state = useGameStore((store) => store.state);
  const now = useServerNow(200);
  const artist = state?.players.find((player) => player.id === state.artistId);
  const seconds = state?.phaseEndsAt ? Math.max(0, Math.ceil((state.phaseEndsAt - now) / 1000)) : 0;

  if (!state) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-night/45 backdrop-blur-[2px]">
      <div className="panel flex flex-col items-center gap-2.5 px-6 py-5 text-center">
        {artist ? <Avatar seed={artist.avatarSeed} name={artist.nickname} size={44} className="rounded-xl" /> : null}
        <p className="text-sm">
          <span className="font-semibold">{artist?.nickname ?? 'The artist'}</span>{' '}
          <span className="text-muted">is picking a word…</span>
        </p>
        <p className="font-display text-2xl font-bold text-lime">{seconds}s</p>
      </div>
    </div>
  );
}
