'use client';

import { useState } from 'react';
import { Check, Copy, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { copyText } from '@/lib/clipboard';

export function RoomCodePill({ code, className = '' }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={`chip group transition hover:border-white/20 hover:bg-white/8 hover:text-ink ${className}`}
      title="Copy room code"
      onClick={async () => {
        const ok = await copyText(code);
        if (ok) {
          setCopied(true);
          toast.success('Room code copied');
          setTimeout(() => setCopied(false), 1_600);
        } else {
          toast.error('Could not copy the code');
        }
      }}
    >
      <Hash size={12} />
      <span className="font-display text-[13px] font-bold tracking-[0.22em] text-ink">{code}</span>
      {copied ? <Check size={12} className="text-lime" /> : <Copy size={12} className="opacity-60" />}
    </button>
  );
}
