import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useAppTranslation } from '@/app/i18n';
import { Button } from '@/shared/components/ui/button';

type ModalProps = {
  children: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
};

/**
 * @reusable
 * @description Render a dismissible modal overlay for page flows.
 * @keywords modal, dialog, overlay, confirmation, close
 */
export function Modal({
  children,
  description,
  footer,
  isOpen,
  onClose,
  title,
}: ModalProps) {
  const { tDefault } = useAppTranslation();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="z-page-modal fixed inset-0 grid place-items-center bg-foreground/35 px-4 py-6"
      role="presentation"
    >
      <div
        aria-modal="true"
        className="grid max-h-[90vh] w-full max-w-2xl gap-5 overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="m-0 text-xl font-semibold text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <Button onClick={onClose} size="sm" type="button" variant="ghost">
            {tDefault('common.actions.close', 'Close')}
          </Button>
        </div>
        {children}
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
