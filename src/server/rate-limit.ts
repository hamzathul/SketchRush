const buckets = new Map<string, number[]>();
let lastSweep = Date.now();

/**
 * Simple in-memory sliding-window rate limiter. Returns true when the action is
 * allowed within the window.
 */
export function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [bucketKey, timestamps] of buckets) {
      if (!timestamps.length || now - timestamps[timestamps.length - 1] > 120_000) {
        buckets.delete(bucketKey);
      }
    }
  }

  const timestamps = (buckets.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);
  if (timestamps.length >= max) {
    buckets.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  buckets.set(key, timestamps);
  return true;
}
