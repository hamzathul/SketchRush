import { describe, expect, it } from 'vitest';
import {
  SCORE,
  artistBonusEligible,
  artistBonusPoints,
  artistPointsForGuess,
  guessScore,
  timeRemainingFraction,
} from '@/lib/scoring';

describe('guessScore', () => {
  const base = { drawMs: 80_000, hints: 0, position: 0, streak: 0 };

  it('awards the maximum base plus first-place bonus for an instant guess', () => {
    expect(guessScore({ ...base, timeMs: 0 })).toBe(700);
  });

  it('scales down with the time taken', () => {
    expect(guessScore({ ...base, timeMs: 40_000 })).toBe(550);
    expect(guessScore({ ...base, timeMs: 80_000 })).toBe(400);
  });

  it('applies hint penalties down to the floor', () => {
    expect(guessScore({ ...base, timeMs: 0, hints: 2 })).toBe(520);
    expect(guessScore({ ...base, timeMs: 80_000, hints: 99 })).toBe(250);
  });

  it('adds position and streak bonuses', () => {
    expect(guessScore({ ...base, timeMs: 0, position: 1 })).toBe(650);
    expect(guessScore({ ...base, timeMs: 0, position: 2 })).toBe(625);
    expect(guessScore({ ...base, timeMs: 0, streak: 3 })).toBe(775);
    expect(guessScore({ ...base, timeMs: 0, streak: 20 })).toBe(800);
  });

  it('never drops below the minimum award', () => {
    expect(guessScore({ ...base, timeMs: 999_999, hints: 99, position: 9, streak: 0 })).toBe(150);
  });
});

describe('artist scoring', () => {
  it('pays more for harder words', () => {
    expect(artistPointsForGuess(1)).toBe(SCORE.artistPerGuess);
    expect(artistPointsForGuess(2)).toBe(125);
    expect(artistPointsForGuess(3)).toBe(150);

    expect(artistBonusPoints(1)).toBe(200);
    expect(artistBonusPoints(2)).toBe(250);
    expect(artistBonusPoints(3)).toBe(300);
  });

  it('only awards the team bonus at 75 percent or better', () => {
    expect(artistBonusEligible(0, 4)).toBe(false);
    expect(artistBonusEligible(2, 4)).toBe(false);
    expect(artistBonusEligible(3, 4)).toBe(true);
    expect(artistBonusEligible(2, 3)).toBe(false);
    expect(artistBonusEligible(3, 3)).toBe(true);
    expect(artistBonusEligible(1, 1)).toBe(true);
    expect(artistBonusEligible(1, 0)).toBe(false);
  });
});

describe('timeRemainingFraction', () => {
  const now = 1_000;

  it('returns zero without an end time', () => {
    expect(timeRemainingFraction(null, 80_000, now)).toBe(0);
  });

  it('clamps between zero and one', () => {
    expect(timeRemainingFraction(now + 80_000, 80_000, now)).toBe(1);
    expect(timeRemainingFraction(now + 40_000, 80_000, now)).toBe(0.5);
    expect(timeRemainingFraction(now - 1, 80_000, now)).toBe(0);
  });
});
