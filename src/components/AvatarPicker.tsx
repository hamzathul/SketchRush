'use client';

import { useState } from 'react';
import { Shuffle } from 'lucide-react';

import { Avatar, randomAvatarSeed } from '@/components/Avatar';
import { Modal } from '@/components/Modal';
import { AVATAR_EMOJIS, COSMETICS, cosmeticForWins } from '@/lib/game-config';
import { getWins } from '@/lib/session';
import { cn } from '@/lib/cn';
import { sfx } from '@/lib/sound';

interface AvatarPickerProps {
  seed: string;
  name?: string;
  onChange: (seed: string) => void;
  size?: number;
}

function isSelected(seed: string, option: string): boolean {
  return seed === option || seed.startsWith(`${option}-`);
}

export function AvatarPicker({ seed, name = '', onChange, size = 46 }: AvatarPickerProps) {
  const [open, setOpen] = useState(false);
  const wins = getWins();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          sfx.click();
        }}
        className="shrink-0 rounded-xl transition hover:scale-105"
        title="Change avatar"
        aria-label="Change avatar"
      >
        <Avatar seed={seed} name={name} size={size} className="rounded-xl" cosmetic={cosmeticForWins(wins)} />
      </button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Pick your avatar"
        description={`${AVATAR_EMOJIS.length} avatars to choose from — animals, faces and characters.`}
        className="max-w-2xl"
      >
        <div className="grid max-h-[52vh] grid-cols-4 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-6 md:grid-cols-8">
          {AVATAR_EMOJIS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                sfx.click();
              }}
              aria-label={`Use avatar ${option}`}
              aria-pressed={isSelected(seed, option)}
              title={option}
              className={cn(
                'flex items-center justify-center rounded-xl p-1 transition hover:bg-white/10',
                isSelected(seed, option) && 'bg-accent/20 ring-1 ring-accent/60',
              )}
            >
              <Avatar seed={option} name={name} size={46} className="rounded-lg" />
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-white/7 bg-white/3 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Winner charms
            </span>
            {COSMETICS.map((cosmetic) => {
              const unlocked = wins >= cosmetic.wins;
              return (
                <span
                  key={cosmetic.id}
                  className={cn(
                    'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
                    unlocked
                      ? 'border-lime/30 bg-lime/10 text-ink'
                      : 'border-white/8 bg-white/3 text-muted/70',
                  )}
                  title={unlocked ? cosmetic.label : `Win ${cosmetic.wins} games to unlock`}
                >
                  <span aria-hidden="true">{unlocked ? cosmetic.emoji : '🔒'}</span>
                  {unlocked ? cosmetic.label : `Win ${cosmetic.wins}`}
                </span>
              );
            })}
            <span className="ml-auto text-[10.5px] text-muted">{wins} win{wins === 1 ? '' : 's'} so far</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">Tap an animal, face or character — your name&apos;s initial rides along in the corner badge.</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                onChange(randomAvatarSeed());
                sfx.click();
              }}
            >
              <Shuffle size={15} /> Surprise me
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
