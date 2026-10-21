'use client';

import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  trigger?: ReactNode;
  children: ReactNode;
  className?: string;
  hideClose?: boolean;
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  children,
  className = '',
  hideClose = false,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-[pop_0.2s_ease-out]" />
        <Dialog.Content
          aria-describedby={description ? undefined : undefined}
          className={`fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto panel p-6 shadow-2xl ${className}`}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-display text-xl font-bold tracking-tight">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description>
              ) : null}
            </div>
            {hideClose ? null : (
              <Dialog.Close asChild>
                <button
                  className="rounded-lg p-2 text-muted transition hover:bg-white/10 hover:text-ink"
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </Dialog.Close>
            )}
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
