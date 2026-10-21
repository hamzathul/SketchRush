import type { Difficulty, RoomSettings } from './types';

export const DEFAULT_SETTINGS: RoomSettings = {
  rounds: 3,
  drawTime: 80,
  maxPlayers: 12,
  hints: 2,
  difficulty: 'mixed',
  customWords: [],
  locked: false,
};

export const LIMITS = {
  minPlayers: 2,
  maxRoomPlayers: 24,
  rounds: { min: 1, max: 10 },
  drawTime: { min: 30, max: 180 },
  maxPlayers: { min: 2, max: 16 },
  hints: { min: 0, max: 3 },
  nickname: { min: 2, max: 16 },
  customWords: { max: 200, maxLength: 30 },
  chatLength: { min: 1, max: 200 },
  maxStrokes: 6000,
  maxPointsPerStroke: 4000,
  maxSnapshotChars: 800_000,
} as const;

export const TIMING = {
  choosingMs: 12_000,
  roundEndMs: 7_000,
  reconnectGraceMs: 25_000,
  allGuessedGraceMs: 1_500,
  sweepIntervalMs: 60_000,
  emptyRoomTtlMs: 10 * 60_000,
  disconnectedTtlMs: 2 * 60_000,
  gameEndTtlMs: 30 * 60_000,
} as const;

export const REACTION_EMOJIS = ['❤️', '😂', '🔥', '👏', '😮', '🎉', '😍', '🤯', '😭', '👍', '👀', '💀'] as const;

export const TOOLS = ['pen', 'marker', 'highlighter', 'eraser'] as const;

export const AVATAR_EMOJIS = [
  // Animals
  '🦊', '🐼', '🦁', '🐯', '🐸', '🐙', '🦄', '🐵', '🐶', '🐱', '🐺', '🦝',
  '🐨', '🐰', '🐹', '🐷', '🐮', '🐔', '🐧', '🦉', '🦅', '🦆', '🦜', '🦩',
  '🐢', '🦎', '🐍', '🐳', '🐬', '🦈', '🐠', '🐡', '🦑', '🦀', '🐝', '🦋',
  '🐌', '🐞', '🦔', '🦥', '🦦', '🐿️', '🦇', '🐊', '🦕', '🦖', '🐘', '🦒',
  '🦓', '🐆', '🐴', '🐑', '🦙', '🐪', '🦭', '🦚',
  // Faces & fantasy
  '😀', '😎', '🤓', '🥳', '🤠', '🤖', '👻', '👽', '🎃', '🧙', '🧛', '🧜',
  '🧚', '🧝', '🧞', '🧟', '🐲', '🦸', '🦹', '💂', '🥷', '🤡', '👑', '🎅',
  // People
  '👩‍🎤', '👨‍🎨', '🧑‍🚀', '🧑‍💻', '👩‍🔬', '🧑‍🍳', '👨‍🌾', '🧑‍🚒', '👮', '🕵️', '🧑‍🎓', '👷',
  '🧑‍✈️', '🧑‍⚕️',
] as const;

/** Winner cosmetics: milestones are counted in games won on this device. */
export const COSMETICS = [
  { id: 'crown', emoji: '👑', label: 'Crown', wins: 1 },
  { id: 'tophat', emoji: '🎩', label: 'Top hat', wins: 3 },
  { id: 'medal', emoji: '🥇', label: 'Gold medal', wins: 6 },
  { id: 'gem', emoji: '💎', label: 'Diamond', wins: 10 },
] as const;

export type CosmeticId = (typeof COSMETICS)[number]['id'];

export function isCosmeticId(value: unknown): value is CosmeticId {
  return typeof value === 'string' && COSMETICS.some((cosmetic) => cosmetic.id === value);
}

export function cosmeticForWins(wins: number): CosmeticId | null {
  let unlocked: CosmeticId | null = null;
  for (const cosmetic of COSMETICS) {
    if (wins >= cosmetic.wins) unlocked = cosmetic.id;
  }
  return unlocked;
}

export function cosmeticEmoji(id: string | null | undefined): string {
  return COSMETICS.find((cosmetic) => cosmetic.id === id)?.emoji ?? '';
}

/** One-tap lines so quiet players still join the banter. */
export const QUICK_LINES_DRAWING = ['too easy 😎', "that's a cat?!", 'hurry up ⏰', 'clueless 😅', 'nice try 🙃'];

export const QUICK_LINES_ARTIST = ['watch this 👀', 'trust the process 🎨', '🔥🔥🔥', '😅'];

export const QUICK_LINES_IDLE = ['gg 🎉', 'so close!', 'one more round?', '🔥🔥🔥'];

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function numberOr(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function sanitizeSettings(input: Partial<RoomSettings>, base: RoomSettings = DEFAULT_SETTINGS): RoomSettings {
  const difficulty: Difficulty =
    input.difficulty === 'easy' || input.difficulty === 'hard' || input.difficulty === 'mixed'
      ? input.difficulty
      : base.difficulty;

  const customWords = Array.isArray(input.customWords)
    ? Array.from(
        new Set(
          input.customWords
            .filter((word): word is string => typeof word === 'string')
            .map((word) => word.trim().replace(/\s+/g, ' '))
            .filter((word) => word.length >= 1 && word.length <= LIMITS.customWords.maxLength),
        ),
      ).slice(0, LIMITS.customWords.max)
    : base.customWords;

  return {
    rounds: Math.round(clamp(numberOr(input.rounds, base.rounds), LIMITS.rounds.min, LIMITS.rounds.max)),
    drawTime: Math.round(clamp(numberOr(input.drawTime, base.drawTime), LIMITS.drawTime.min, LIMITS.drawTime.max)),
    maxPlayers: Math.round(
      clamp(numberOr(input.maxPlayers, base.maxPlayers), LIMITS.maxPlayers.min, LIMITS.maxPlayers.max),
    ),
    hints: Math.round(clamp(numberOr(input.hints, base.hints), LIMITS.hints.min, LIMITS.hints.max)),
    difficulty,
    customWords,
    locked: Boolean(input.locked ?? base.locked),
  };
}
