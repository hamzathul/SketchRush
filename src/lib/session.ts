import type { SessionInfo } from './types';

const SESSION_PREFIX = 'sketchrush:session:';
const NICKNAME_KEY = 'sketchrush:nickname';
const AVATAR_KEY = 'sketchrush:avatar';

function safeGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private mode; the game still works for this tab.
  }
}

export function loadSession(code: string): SessionInfo | null {
  const raw = safeGet(`${SESSION_PREFIX}${code.toUpperCase()}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SessionInfo>;
    if (typeof parsed.playerId === 'string' && typeof parsed.token === 'string') {
      return { playerId: parsed.playerId, token: parsed.token };
    }
  } catch {
    // Ignore malformed sessions.
  }
  return null;
}

export function saveSession(code: string, session: SessionInfo): void {
  safeSet(`${SESSION_PREFIX}${code.toUpperCase()}`, JSON.stringify(session));
}

export function clearSession(code: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(`${SESSION_PREFIX}${code.toUpperCase()}`);
  } catch {
    // noop
  }
}

export function getNickname(): string {
  return safeGet(NICKNAME_KEY) ?? '';
}

export function saveNickname(nickname: string): void {
  safeSet(NICKNAME_KEY, nickname);
}

export function getAvatarSeed(): string {
  return safeGet(AVATAR_KEY) ?? '';
}

export function saveAvatarSeed(seed: string): void {
  safeSet(AVATAR_KEY, seed);
}

const WINS_KEY = 'sketchrush:wins';

/** Games won on this device — drives the winner cosmetics. */
export function getWins(): number {
  const raw = Number(safeGet(WINS_KEY) ?? 0);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
}

export function addWin(): number {
  const wins = getWins() + 1;
  safeSet(WINS_KEY, String(wins));
  return wins;
}
