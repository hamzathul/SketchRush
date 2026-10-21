'use client';

import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isMuted, setMuted, sfx } from '@/lib/sound';

export function SoundToggle({ className = '' }: { className?: string }) {
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    setMutedState(isMuted());
  }, []);

  return (
    <button
      type="button"
      className={`btn btn-ghost h-9 w-9 p-0 ${className}`}
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      onClick={() => {
        const next = !muted;
        setMuted(next);
        setMutedState(next);
        if (!next) sfx.click();
      }}
    >
      {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
    </button>
  );
}
