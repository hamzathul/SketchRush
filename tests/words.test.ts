import { describe, expect, it } from 'vitest';
import { WORD_POOLS, pickWordChoices, wordPoolSize } from '@/lib/words';
import { normalizeKey } from '@/lib/normalize';
import type { WordChoice } from '@/lib/types';

function starList(choices: WordChoice[]): number[] {
  return choices.map((choice) => choice.stars);
}

describe('pickWordChoices', () => {
  it('returns three unique choices with one of each tier in mixed mode', () => {
    const choices = pickWordChoices('mixed', new Set());
    expect(choices).toHaveLength(3);
    expect(starList(choices).sort()).toEqual([1, 2, 3]);
    expect(new Set(choices.map((choice) => normalizeKey(choice.word))).size).toBe(3);
  });

  it('keeps easy and hard modes on their tier', () => {
    expect(starList(pickWordChoices('easy', new Set())).every((stars) => stars === 1)).toBe(true);
    expect(starList(pickWordChoices('hard', new Set())).every((stars) => stars === 3)).toBe(true);
  });

  it('avoids words already used this game', () => {
    const used = new Set(WORD_POOLS.easy);
    const choices = pickWordChoices('easy', used);
    expect(choices).toHaveLength(3);
    expect(choices.every((choice) => !used.has(choice.word))).toBe(true);
    expect(new Set(choices.map((choice) => normalizeKey(choice.word))).size).toBe(3);
  });

  it('recovers when every natural word has been used', () => {
    const used = new Set([...WORD_POOLS.easy, ...WORD_POOLS.medium, ...WORD_POOLS.hard]);
    const choices = pickWordChoices('easy', used);
    expect(choices).toHaveLength(3);
    expect(new Set(choices.map((choice) => normalizeKey(choice.word))).size).toBe(3);
  });

  it('treats custom words as medium difficulty', () => {
    const used = new Set([...WORD_POOLS.easy, ...WORD_POOLS.medium, ...WORD_POOLS.hard]);
    const choices = pickWordChoices('mixed', used, ['custom doodle']);
    const custom = choices.find((choice) => choice.word === 'custom doodle');
    expect(custom?.stars).toBe(2);
    expect(choices).toHaveLength(3);
  });

  it('has a non-empty combined word pool', () => {
    expect(wordPoolSize()).toBeGreaterThan(100);
  });

  it('has deep pools for multi-day sessions', () => {
    expect(WORD_POOLS.easy.length).toBeGreaterThan(600);
    expect(WORD_POOLS.medium.length).toBeGreaterThan(600);
    expect(WORD_POOLS.hard.length).toBeGreaterThan(600);
    expect(wordPoolSize()).toBeGreaterThan(1800);
  });
});
