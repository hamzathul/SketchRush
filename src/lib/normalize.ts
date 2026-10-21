/** Normalize a word or guess for comparison: lowercase, no accents, letters+digits only. */
export function normalizeWord(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]/g, '');
}

export function normalizeKey(input: string): string {
  return normalizeWord(input);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** True when a guess is a near miss (one typo away). */
export function isCloseGuess(guess: string, word: string): boolean {
  const g = normalizeWord(guess);
  const w = normalizeWord(word);
  if (g.length < 4 || w.length < 4) return false;
  if (g === w) return false;
  if (Math.abs(g.length - w.length) > 1) return false;
  return levenshtein(g, w) <= 1;
}

/** Edit distance for the round-end "so close" callout, or null when the guess is far off. */
export function nearMissDistance(guess: string, word: string): number | null {
  const g = normalizeWord(guess);
  const w = normalizeWord(word);
  if (g.length < 4 || w.length < 4) return null;
  if (g === w) return null;
  if (Math.abs(g.length - w.length) > 2) return null;
  const distance = levenshtein(g, w);
  return distance <= 2 ? distance : null;
}

/** Indexes of alphabetic characters in a word (used for hints). */
export function letterIndices(word: string): number[] {
  return Array.from(word)
    .map((char, index) => (/[\p{L}\p{N}]/u.test(char) ? index : -1))
    .filter((index) => index >= 0);
}

/** Reveal only the given character indexes; everything else becomes a dot. */
export function maskWord(word: string, revealed: number[]): string {
  const revealedSet = new Set(revealed);
  return Array.from(word)
    .map((char, index) => {
      if (/\s/.test(char)) return ' ';
      if (!/[\p{L}\p{N}]/u.test(char)) return char;
      return revealedSet.has(index) ? char : '•';
    })
    .join('');
}

/** Percentage of letters revealed (0..1). */
export function revealFraction(word: string, revealed: number[]): number {
  const letters = letterIndices(word).length;
  if (!letters) return 0;
  return revealed.length / letters;
}
