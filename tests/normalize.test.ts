import { describe, expect, it } from 'vitest';
import { isCloseGuess, letterIndices, levenshtein, maskWord, nearMissDistance, normalizeKey, normalizeWord, revealFraction } from '@/lib/normalize';

describe('normalizeWord', () => {
  it('lowercases, strips accents and punctuation', () => {
    expect(normalizeWord('  Café & Crème!! ')).toBe('cafeandcreme');
    expect(normalizeWord('R2-D2')).toBe('r2d2');
    expect(normalizeWord('👻 Ghost')).toBe('ghost');
  });

  it('treats an ampersand as the word and', () => {
    expect(normalizeWord('salt & pepper')).toBe('saltandpepper');
  });

  it('uses the same key for normalized guesses', () => {
    expect(normalizeKey('Hot  Dog!')).toBe('hotdog');
  });
});

describe('levenshtein', () => {
  it('computes edit distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('same', 'same')).toBe(0);
    expect(levenshtein('', 'abc')).toBe(3);
  });
});

describe('isCloseGuess', () => {
  it('accepts one-character typos on longer words', () => {
    expect(isCloseGuess('elepant', 'elephant')).toBe(true);
    expect(isCloseGuess('ghost', 'ghosts')).toBe(true);
  });

  it('rejects exact answers and short words', () => {
    expect(isCloseGuess('ghost', 'ghost')).toBe(false);
    expect(isCloseGuess('cat', 'bat')).toBe(false);
  });
});

describe('nearMissDistance', () => {
  it('measures how far a wrong guess was', () => {
    expect(nearMissDistance('elepant', 'elephant')).toBe(1);
    expect(nearMissDistance('elephnat', 'elephant')).toBe(2);
    expect(nearMissDistance('elephxzt', 'elephant')).toBe(2);
  });

  it('ignores exact answers, short words and wild guesses', () => {
    expect(nearMissDistance('elephant', 'elephant')).toBeNull();
    expect(nearMissDistance('cat', 'bat')).toBeNull();
    expect(nearMissDistance('bicycle', 'elephant')).toBeNull();
  });
});

describe('hint helpers', () => {
  it('finds letters and digits, ignoring punctuation and spaces', () => {
    expect(letterIndices('hot dog!')).toEqual([0, 1, 2, 4, 5, 6]);
    expect(letterIndices('R2-D2')).toEqual([0, 1, 3, 4]);
  });

  it('masks unrevealed characters but keeps spaces and punctuation', () => {
    expect(maskWord('ice cream', [0, 4])).toBe('i•• c••••');
    expect(maskWord('R2-D2', [0, 3])).toBe('R•-D•');
  });

  it('reports the fraction of letters revealed', () => {
    expect(revealFraction('ice cream', [0, 4])).toBe(0.25);
    expect(revealFraction('!!!', [])).toBe(0);
  });
});
