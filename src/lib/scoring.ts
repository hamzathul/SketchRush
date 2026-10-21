export const SCORE = {
  baseMin: 300,
  baseMax: 600,
  firstBonus: 100,
  secondBonus: 50,
  thirdBonus: 25,
  streakBonus: 25,
  streakCap: 100,
  artistPerGuess: 100,
  artistBonus: 200,
  hintPenalty: 0.15,
  hintFloor: 0.5,
} as const;

export interface GuessScoreInput {
  timeMs: number;
  drawMs: number;
  hints: number;
  position: number;
  streak: number;
}

/** Points a guesser earns (0-indexed position). Artist points are separate. */
export function guessScore({ timeMs, drawMs, hints, position, streak }: GuessScoreInput): number {
  const safeDraw = Math.max(1, drawMs);
  const remaining = Math.min(safeDraw, Math.max(0, safeDraw - timeMs));
  const fraction = remaining / safeDraw;

  const base = SCORE.baseMin + (SCORE.baseMax - SCORE.baseMin) * fraction;
  const hintMultiplier = Math.max(SCORE.hintFloor, 1 - SCORE.hintPenalty * Math.max(0, hints));
  const positionBonus =
    position === 0 ? SCORE.firstBonus : position === 1 ? SCORE.secondBonus : position === 2 ? SCORE.thirdBonus : 0;
  const streakBonus = Math.min(SCORE.streakCap, Math.max(0, streak) * SCORE.streakBonus);

  return Math.max(50, Math.round(base * hintMultiplier) + positionBonus + streakBonus);
}

/** Multiplier for the artist, based on the difficulty stars of the chosen word. */
export function starMultiplier(stars: number): number {
  if (stars >= 3) return 1.5;
  if (stars === 2) return 1.25;
  return 1;
}

export function artistPointsForGuess(stars: number): number {
  return Math.round(SCORE.artistPerGuess * starMultiplier(stars));
}

export function artistBonusPoints(stars: number): number {
  return Math.round(SCORE.artistBonus * starMultiplier(stars));
}

/** Artist bonus is earned when at least 75% of eligible guessers got the word. */
export function artistBonusEligible(correctGuessers: number, eligibleGuessers: number): boolean {
  if (correctGuessers <= 0 || eligibleGuessers <= 0) return false;
  return correctGuessers >= Math.ceil(eligibleGuessers * 0.75);
}

/** 0..1 fraction of time remaining. */
export function timeRemainingFraction(endsAt: number | null, drawMs: number, now = Date.now()): number {
  if (!endsAt) return 0;
  return Math.min(1, Math.max(0, (endsAt - now) / Math.max(1, drawMs)));
}
