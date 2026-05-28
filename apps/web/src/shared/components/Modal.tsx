import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useAppTranslation } from '@/app/i18n';
import { Button } from '@/shared/components/ui/button';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

type ModalProps = {
  children: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  title: ReactNode;
};

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-[calc(100vw-2rem)]',
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
  size = 'md',
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
        className={`flex max-h-[90vh] w-full flex-col rounded-lg border border-border bg-card shadow-xl ${SIZE_CLASSES[size]}`}
        role="dialog"
      >
        <div className="flex-none p-5 pb-0">
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
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
        {footer ? (
          <div className="flex-none border-t border-border p-5 pt-4">
            <div className="flex flex-wrap justify-end gap-2">
              {footer}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
