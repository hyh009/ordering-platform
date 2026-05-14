import { X } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { cn } from '@/shared/utils/cn';

type ToastItem = {
  id: string;
  tone: 'info' | 'success' | 'error';
  message: string;
  title?: string;
};

type ToastHostProps = {
  toasts: ToastItem[];
  onDismiss: (toastId: string) => void;
};

const toastToneClassName: Record<ToastItem['tone'], string> = {
  info: 'border-l-primary',
  success: 'border-l-primary',
  error: 'border-l-destructive',
};

export function ToastHost({ toasts, onDismiss }: ToastHostProps) {
  const { tDefault } = useAppTranslation();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="fixed top-20 right-4 z-30 grid w-[22.5rem] max-w-[calc(100vw-2rem)] gap-2.5"
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
            aria-label={tDefault(
              'app.feedback.dismissNotification',
              'Dismiss notification',
            )}
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
