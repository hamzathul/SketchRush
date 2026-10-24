'use client';

import { useEffect, useState } from 'react';
import { Share, Smartphone, X } from 'lucide-react';
import { toast } from 'sonner';
import { BrandMark } from '@/components/BrandMark';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}

const DISMISS_KEY = 'sketchrush:pwa-install-dismissed';
const DISMISS_DAYS = 21;

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function recentlyDismissed(): boolean {
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
    return Number.isFinite(at) && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * A quiet install card for the landing page. Chromium browsers expose
 * `beforeinstallprompt`; iOS gets the Share → Add to Home Screen recipe.
 */
export function PwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;
    setIos(isIosDevice());

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setIos(false);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        toast.success('SketchRush installed — see you on the home screen.');
        setDeferred(null);
      }
    } catch {
      toast.error('The install prompt could not open. Try again from your browser menu.');
    }
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // The card can still be dismissed for this visit.
    }
  };

  if (dismissed || (!deferred && !ios)) return null;

  return (
    <section id="install" className="mx-auto w-full max-w-4xl px-5 pb-16 sm:px-8">
      <div className="panel relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-black/20">
            <BrandMark size={42} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-lime">
              <Smartphone size={12} /> SketchRush app
            </p>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight">
              Install for the next game night
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Full-screen play, a home-screen shortcut, and a friendly offline screen when the Wi-Fi ghosts you.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:shrink-0">
            {deferred ? (
              <button type="button" className="btn btn-primary" onClick={install}>
                Install app
              </button>
            ) : null}
            {ios ? (
              <button type="button" className="btn btn-ghost" onClick={() => setShowSteps((value) => !value)}>
                <Share size={15} /> How to install
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-lg p-2 text-muted transition hover:bg-white/10 hover:text-ink"
              onClick={dismiss}
              aria-label="Dismiss install prompt"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {ios && showSteps ? (
          <div className="relative mt-4 rounded-xl border border-white/7 bg-black/20 px-4 py-3 text-sm text-muted">
            <p className="font-medium text-ink">On iPhone or iPad</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed">
              <li>Open SketchRush in Safari.</li>
              <li>Tap the Share button in the toolbar.</li>
              <li>Choose <span className="font-medium text-ink">Add to Home Screen</span>, then tap Add.</li>
            </ol>
          </div>
        ) : null}
      </div>
    </section>
  );
}
