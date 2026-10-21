import { normalizeWord } from '../../lib/normalize';
import { AVATAR_EMOJIS, isCosmeticId } from '../../lib/game-config';

const PROFANITY = [
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'dickhead',
  'asshole',
  'bastard',
  'slut',
  'whore',
  'nigger',
  'nigga',
  'faggot',
  'retard',
];

const PROFANITY_RE = new RegExp(`\\b(${PROFANITY.join('|')})\\b`, 'gi');

export function sanitizeNickname(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16);
}

export function sanitizeChat(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

export function sanitizeAvatarSeed(raw: unknown): string {
  if (typeof raw !== 'string') return 'orbit';
  const cleaned = raw.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  const [base, suffix = ''] = cleaned.split('-');
  if ((AVATAR_EMOJIS as readonly string[]).includes(base)) {
    const safeSuffix = suffix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    return safeSuffix ? `${base}-${safeSuffix}` : base;
  }
  const legacy = cleaned.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
  return legacy || 'orbit';
}

export function sanitizeCosmetic(raw: unknown): string | null {
  return isCosmeticId(raw) ? raw : null;
}

export function containsProfanity(text: string): boolean {
  PROFANITY_RE.lastIndex = 0;
  return PROFANITY_RE.test(text);
}

export function maskProfanity(text: string): string {
  PROFANITY_RE.lastIndex = 0;
  return text.replace(PROFANITY_RE, (match) => match[0] + '*'.repeat(Math.max(1, match.length - 1)));
}

/** Prevent the artist from typing the answer in chat. */
export function containsAnswer(text: string, answer: string): boolean {
  const normalizedAnswer = normalizeWord(answer);
  if (!normalizedAnswer) return false;

  if (normalizedAnswer.length <= 3) {
    return text
      .split(/\s+/)
      .map((token) => normalizeWord(token))
      .some((token) => token === normalizedAnswer);
  }

  return normalizeWord(text).includes(normalizedAnswer);
}
