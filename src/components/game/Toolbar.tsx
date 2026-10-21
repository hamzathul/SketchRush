'use client';

import {
  Brush,
  Download,
  Eraser,
  Highlighter,
  Maximize2,
  Minimize2,
  PaintBucket,
  Pencil,
  Trash2,
  Undo2,
} from 'lucide-react';
import type { Tool } from '@/lib/types';
import { cn } from '@/lib/cn';

export type UiTool = Tool | 'fill';

const COLORS = [
  '#111827',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#78350f',
  '#ffffff',
];

const TOOLS: Array<{ id: UiTool; label: string; shortcut: string; icon: React.ReactNode }> = [
  { id: 'pen', label: 'Pen', shortcut: 'B', icon: <Pencil size={16} /> },
  { id: 'marker', label: 'Marker', shortcut: 'M', icon: <Brush size={16} /> },
  { id: 'highlighter', label: 'Highlighter', shortcut: 'H', icon: <Highlighter size={16} /> },
  { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: <Eraser size={16} /> },
  { id: 'fill', label: 'Fill', shortcut: 'F', icon: <PaintBucket size={16} /> },
];

interface ToolbarProps {
  tool: UiTool;
  onToolChange: (tool: UiTool) => void;
  color: string;
  onColorChange: (color: string) => void;
  size: number;
  onSizeChange: (size: number) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  canUndo: boolean;
  onUndo: () => void;
  onClear: () => void;
  onDownload: () => void;
  focused: boolean;
  onToggleFocus: () => void;
}

export function Toolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  size,
  onSizeChange,
  opacity,
  onOpacityChange,
  canUndo,
  onUndo,
  onClear,
  onDownload,
  focused,
  onToggleFocus,
}: ToolbarProps) {
  const opacityDisabled = tool === 'highlighter' || tool === 'eraser' || tool === 'fill';
  const colorDisabled = tool === 'eraser';

  return (
    <div className="panel flex shrink-0 flex-wrap items-center gap-1.5 p-1.5 sm:gap-2 sm:p-2">
      <div className="flex items-center gap-0.5 rounded-xl border border-white/6 bg-black/20 p-0.5">
        {TOOLS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onToolChange(item.id)}
            title={`${item.label} (${item.shortcut})`}
            aria-label={item.label}
            aria-pressed={tool === item.id}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg transition lg:h-7 lg:w-7',
              tool === item.id
                ? 'bg-white/12 text-lime shadow-inner'
                : 'text-muted hover:bg-white/6 hover:text-ink',
            )}
          >
            {item.icon}
          </button>
        ))}
      </div>

      <span className="hidden h-6 w-px bg-white/10 sm:block" />

      <div className="flex items-center gap-0.5">
        {COLORS.map((swatch) => (
          <button
            key={swatch}
            type="button"
            disabled={colorDisabled}
            onClick={() => onColorChange(swatch)}
            title={swatch}
            aria-label={`Color ${swatch}`}
            className={cn(
              'h-5 w-5 rounded-full border border-black/20 transition hover:scale-110 disabled:opacity-30',
              color === swatch && !colorDisabled ? 'ring-2 ring-white ring-offset-2 ring-offset-surface' : '',
              swatch === '#ffffff' ? 'border-white/30' : '',
            )}
            style={{ backgroundColor: swatch }}
          />
        ))}

        <label
          className={cn(
            'relative flex h-5 w-5 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-white/25 bg-[conic-gradient(from_0deg,#ef4444,#f59e0b,#84cc16,#06b6d4,#8b5cf6,#ef4444)] transition hover:scale-110',
            colorDisabled && 'pointer-events-none opacity-30',
          )}
          title="Custom color"
        >
          <input
            type="color"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            value={color}
            onChange={(event) => onColorChange(event.target.value)}
            aria-label="Pick a custom color"
          />
        </label>
      </div>

      <span className="hidden h-6 w-px bg-white/10 sm:block" />

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-[11px] text-muted" title="Brush size">
          <span className="hidden sm:inline">Size</span>
          <input
            type="range"
            min={2}
            max={48}
            step={2}
            value={size}
            onChange={(event) => onSizeChange(Number(event.target.value))}
            className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/15 accent-lime"
            style={{ accentColor: '#b8f36b' }}
            aria-label="Brush size"
          />
          <span className="w-5 tabular-nums">{size}</span>
        </label>

        <label
          className={cn(
            'hidden items-center gap-1.5 text-[11px] text-muted md:flex',
            opacityDisabled && 'opacity-35',
          )}
          title="Opacity"
        >
          Opacity
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={opacity * 100}
            disabled={opacityDisabled}
            onChange={(event) => onOpacityChange(Number(event.target.value) / 100)}
            className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/15"
            style={{ accentColor: '#22d3ee' }}
            aria-label="Brush opacity"
          />
        </label>
      </div>

      <span className="hidden h-6 w-px bg-white/10 sm:block" />

      <div className="ml-auto flex items-center gap-0.5">
        <button
          type="button"
          className="rounded-lg p-2 text-muted transition hover:bg-white/8 hover:text-ink lg:p-1.5"
          onClick={onToggleFocus}
          title={focused ? 'Exit focus mode (Esc)' : 'Focus on the canvas'}
          aria-label={focused ? 'Exit focus mode' : 'Focus on the canvas'}
          aria-pressed={focused}
        >
          {focused ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        <button
          type="button"
          className="rounded-lg p-2 text-muted transition hover:bg-white/8 hover:text-ink disabled:opacity-30 lg:p-1.5"
          disabled={!canUndo}
          onClick={onUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo last stroke"
        >
          <Undo2 size={16} />
        </button>
        <button
          type="button"
          className="rounded-lg p-2 text-muted transition hover:bg-danger/15 hover:text-danger lg:p-1.5"
          onClick={onClear}
          title="Clear canvas"
          aria-label="Clear canvas"
        >
          <Trash2 size={16} />
        </button>
        <button
          type="button"
          className="rounded-lg p-2 text-muted transition hover:bg-white/8 hover:text-ink lg:p-1.5"
          onClick={onDownload}
          title="Download drawing"
          aria-label="Download drawing as PNG"
        >
          <Download size={16} />
        </button>
      </div>
    </div>
  );
}
