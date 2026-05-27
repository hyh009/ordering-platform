import { X } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

type ToastItem = {
  id: string;
  tone: 'info' | 'success' | 'error';
  message: string;
  title?: string;
};

type ToastHostProps = {
  dismissLabel: string;
  onDismiss: (toastId: string) => void;
  toasts: ToastItem[];
};

const toastToneClassName: Record<ToastItem['tone'], string> = {
  info: 'border-l-primary',
  success: 'border-l-primary',
  error: 'border-l-destructive',
};

export function ToastHost({ dismissLabel, onDismiss, toasts }: ToastHostProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="z-feedback-toast fixed top-20 right-4 grid w-[22.5rem] max-w-[calc(100vw-2rem)] gap-2.5"
    >
      {toasts.map((toast) => (
        <section
          className={cn(
            'flex items-start justify-between gap-3 rounded-lg border border-l-4 border-border bg-card px-4 py-3 shadow-xl',
            toastToneClassName[toast.tone],
          )}
          key={toast.id}
        >
          <div>
            {toast.title ? (
              <strong className="mb-1 block text-sm text-foreground">
                {toast.title}
              </strong>
            ) : null}
            <p className="m-0 text-sm text-muted-foreground">{toast.message}</p>
          </div>
          <button
            aria-label={dismissLabel}
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => {
              onDismiss(toast.id);
            }}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </section>
      ))}
    </div>
  );
}
