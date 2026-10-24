'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker after the app is interactive.
 * Production-only so Turbopack HMR keeps working during development.
 */
export function PwaRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      void navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => registration.update().catch(() => undefined))
        .catch(() => undefined);
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }

    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
