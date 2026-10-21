'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from './store';

/** Server-synchronized clock (updated on every state push). */
export function useServerNow(intervalMs = 120): number {
  const offset = useGameStore((store) => store.clockOffset);
  const [now, setNow] = useState(() => Date.now() + offset);

  useEffect(() => {
    setNow(Date.now() + offset);
    const interval = setInterval(() => setNow(Date.now() + offset), intervalMs);
    return () => clearInterval(interval);
  }, [offset, intervalMs]);

  return now;
}
