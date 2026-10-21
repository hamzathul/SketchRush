let context: AudioContext | null = null;
let muted = false;

const MUTE_KEY = 'sketchrush:muted';

if (typeof window !== 'undefined') {
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    muted = false;
  }
}

function getContext(): AudioContext | null {
  if (typeof window === 'undefined' || muted) return null;
  try {
    if (!context) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return null;
  }
}

interface ToneOptions {
  frequency: number;
  duration?: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  slideTo?: number;
}

function tone({ frequency, duration = 0.12, type = 'sine', gain = 0.06, delay = 0, slideTo }: ToneOptions): void {
  const audio = getContext();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const volume = audio.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + duration);

  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(volume);
  volume.connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(MUTE_KEY, value ? '1' : '0');
    } catch {
      // noop
    }
  }
}

export const sfx = {
  click(): void {
    tone({ frequency: 520, duration: 0.06, type: 'triangle', gain: 0.035 });
  },
  join(): void {
    tone({ frequency: 440, duration: 0.1, type: 'sine', gain: 0.05 });
    tone({ frequency: 660, duration: 0.12, type: 'sine', gain: 0.045, delay: 0.09 });
  },
  leave(): void {
    tone({ frequency: 380, duration: 0.1, type: 'sine', gain: 0.04 });
    tone({ frequency: 260, duration: 0.14, type: 'sine', gain: 0.035, delay: 0.08 });
  },
  start(): void {
    [392, 523, 659].forEach((frequency, index) => {
      tone({ frequency, duration: 0.14, type: 'triangle', gain: 0.05, delay: index * 0.1 });
    });
  },
  correct(): void {
    tone({ frequency: 659, duration: 0.1, type: 'triangle', gain: 0.06 });
    tone({ frequency: 988, duration: 0.16, type: 'triangle', gain: 0.05, delay: 0.08 });
  },
  wrong(): void {
    tone({ frequency: 220, duration: 0.18, type: 'sawtooth', gain: 0.025, slideTo: 150 });
  },
  tick(): void {
    tone({ frequency: 880, duration: 0.04, type: 'square', gain: 0.02 });
  },
  reveal(): void {
    tone({ frequency: 523, duration: 0.1, type: 'sine', gain: 0.05 });
    tone({ frequency: 784, duration: 0.14, type: 'sine', gain: 0.05, delay: 0.09 });
  },
  win(): void {
    [523, 659, 784, 1047].forEach((frequency, index) => {
      tone({ frequency, duration: 0.22, type: 'triangle', gain: 0.055, delay: index * 0.13 });
    });
  },
};
