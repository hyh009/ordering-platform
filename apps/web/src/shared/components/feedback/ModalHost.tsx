import { Button } from '@/shared/components/ui/button';

type ModalViewState = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: 'info' | 'success' | 'error';
};

type ModalHostProps = {
  modal: ModalViewState | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ModalHost({ modal, onCancel, onConfirm }: ModalHostProps) {
  if (!modal) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-40 flex items-center justify-center bg-foreground/45 p-5"
      role="dialog"
    >
      <section className="grid w-full max-w-[26.25rem] gap-6 rounded-lg border border-border bg-card p-6 shadow-2xl">
        <div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            {modal.title}
          </h2>
          <p className="m-0 text-sm text-muted-foreground">{modal.message}</p>
        </div>
        <div className="flex justify-end gap-2.5">
          <Button onClick={onCancel} type="button" variant="outline">
            {modal.cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            type="button"
            variant={modal.tone === 'error' ? 'destructive' : 'default'}
          >
            {modal.confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
