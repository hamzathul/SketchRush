import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, LIMITS, clamp, sanitizeSettings } from '@/lib/game-config';

describe('clamp', () => {
  it('bounds values inclusively', () => {
    expect(clamp(5, 1, 3)).toBe(3);
    expect(clamp(-1, 1, 3)).toBe(1);
    expect(clamp(2, 1, 3)).toBe(2);
  });
});

describe('sanitizeSettings', () => {
  it('keeps defaults when nothing is provided', () => {
    expect(sanitizeSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it('clamps numeric settings to the supported ranges', () => {
    const high = sanitizeSettings({ rounds: 99, drawTime: 1, maxPlayers: 99, hints: 9 });
    expect(high.rounds).toBe(LIMITS.rounds.max);
    expect(high.drawTime).toBe(LIMITS.drawTime.min);
    expect(high.maxPlayers).toBe(LIMITS.maxPlayers.max);
    expect(high.hints).toBe(LIMITS.hints.max);

    const low = sanitizeSettings({ rounds: -5, drawTime: 999, maxPlayers: 1, hints: -1 });
    expect(low.rounds).toBe(LIMITS.rounds.min);
    expect(low.drawTime).toBe(LIMITS.drawTime.max);
    expect(low.maxPlayers).toBe(LIMITS.maxPlayers.min);
    expect(low.hints).toBe(LIMITS.hints.min);
  });

  it('falls back to defaults for non-finite numbers', () => {
    const settings = sanitizeSettings({
      rounds: Number.NaN,
      drawTime: Number.POSITIVE_INFINITY,
      maxPlayers: Number.NaN,
      hints: Number.NaN,
    });
    expect(settings.rounds).toBe(DEFAULT_SETTINGS.rounds);
    expect(settings.drawTime).toBe(DEFAULT_SETTINGS.drawTime);
    expect(settings.maxPlayers).toBe(DEFAULT_SETTINGS.maxPlayers);
    expect(settings.hints).toBe(DEFAULT_SETTINGS.hints);
  });

  it('rejects unknown difficulties', () => {
    // @ts-expect-error deliberately invalid input
    expect(sanitizeSettings({ difficulty: 'impossible' }).difficulty).toBe('mixed');
  });

  it('cleans, dedupes and limits custom words', () => {
    const settings = sanitizeSettings({
      customWords: ['  hot   dog ', '', 'x', 'hot dog', 'a'.repeat(LIMITS.customWords.maxLength + 1)],
    });
    expect(settings.customWords).toEqual(['hot dog', 'x']);

    const many = Array.from({ length: LIMITS.customWords.max + 20 }, (_, index) => `word-${index}`);
    expect(sanitizeSettings({ customWords: many }).customWords).toHaveLength(LIMITS.customWords.max);
  });

  it('preserves the locked flag', () => {
    expect(sanitizeSettings({ locked: true }).locked).toBe(true);
    expect(sanitizeSettings({ locked: false }, { ...DEFAULT_SETTINGS, locked: true }).locked).toBe(false);
  });
});
