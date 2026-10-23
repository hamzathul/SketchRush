'use client';

import { useState, type ReactNode } from 'react';
import { Modal } from './Modal';
import { PenLine, Lightbulb, Timer, Trophy } from 'lucide-react';

const steps = [
  {
    icon: <PenLine size={18} />,
    title: 'Pick a word',
    text: 'The artist gets three secret words. Pick your poison — harder words earn the artist more points.',
  },
  {
    icon: <Timer size={18} />,
    title: 'Draw fast',
    text: 'Sketch with pen, marker, highlighter, bucket fill, or line, rectangle and ellipse shapes. Fill and clear can be undone.',
  },
  {
    icon: <Lightbulb size={18} />,
    title: 'Guess it',
    text: 'Everyone else types guesses in chat. Letters reveal over time. First correct guess scores the most.',
  },
  {
    icon: <Trophy size={18} />,
    title: 'Stack points',
    text: 'Guess streaks, speed and word difficulty all pay out. Every player takes a turn drawing each round.',
  },
];

export function HowToPlayDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title="How to play"
      description="No account, no download. Two clicks and you're in."
    >
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.title} className="flex gap-3 rounded-2xl border border-white/6 bg-white/3 p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-2">
              {step.icon}
            </div>
            <div>
              <p className="text-sm font-semibold">
                <span className="mr-2 text-xs text-muted">{index + 1}.</span>
                {step.title}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted">{step.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-lime/20 bg-lime/5 p-4 text-sm text-muted">
        <p className="font-semibold text-lime">Scoring cheat sheet</p>
        <ul className="mt-2 space-y-1">
          <li>• Base guess: 300–600 points, faster is better.</li>
          <li>• First, second and third correct guesses get +100 / +50 / +25.</li>
          <li>• Consecutive correct guesses add a streak bonus.</li>
          <li>• Hints lower a guess&apos;s value; the artist earns per correct guesser.</li>
        </ul>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        Tip: <span className="text-ink">B / M / H / E / F</span> switch tools,{' '}
        <span className="text-ink">L / R / O</span> draw shapes, <span className="text-ink">[ / ]</span> change brush
        size, <span className="text-ink">Ctrl+Z</span> undoes your last action. Spectators join at the next round, every
        round ends with a replay, and the game ends with a shareable recap.
      </p>
    </Modal>
  );
}
