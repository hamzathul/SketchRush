const RECENT_KEY = 'sketchrush:recent-rooms';
const MAX_RECENT = 4;

export interface RecentRoom {
  code: string;
  nickname?: string;
  at: number;
}

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
    // Private mode and storage restrictions should not break the game.
  }
}

export function getRecentRooms(): RecentRoom[] {
  const raw = safeGet(RECENT_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is RecentRoom => {
        if (!entry || typeof entry !== 'object') return false;
        const candidate = entry as Partial<RecentRoom>;
        return (
          typeof candidate.code === 'string' &&
          /^[A-Z0-9]{4,8}$/.test(candidate.code) &&
          typeof candidate.at === 'number'
        );
      })
      .sort((a, b) => b.at - a.at)
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function rememberRoom(code: string, nickname?: string): void {
  const cleanCode = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(cleanCode)) return;

  const next = getRecentRooms().filter((room) => room.code !== cleanCode);
  next.unshift({
    code: cleanCode,
    nickname: nickname?.trim() || undefined,
    at: Date.now(),
  });
  safeSet(RECENT_KEY, JSON.stringify(next.slice(0, MAX_RECENT)));
}

export function forgetRoom(code: string): void {
  const cleanCode = code.trim().toUpperCase();
  safeSet(
    RECENT_KEY,
    JSON.stringify(getRecentRooms().filter((room) => room.code !== cleanCode)),
  );
}

export function clearRecentRooms(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(RECENT_KEY);
  } catch {
    // noop
  }
}

export function timeAgo(at: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
