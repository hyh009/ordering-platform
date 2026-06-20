import { useState } from 'react';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppTranslation } from '@/app/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

type AllergenDisplayProps = {
  allergens: string[];
  /** Max allergens shown inline. Undefined = show all (no modal or icon). */
  visibleCount?: number;
};

export function AllergenDisplay({
  allergens,
  visibleCount,
}: AllergenDisplayProps) {
  const [open, setOpen] = useState(false);
  const { i18n } = useTranslation();
  const { tDefault } = useAppTranslation();

  if (allergens.length === 0) return null;

  const separator = i18n.language.startsWith('zh') ? '、' : ', ';
  const visible =
    visibleCount !== undefined ? allergens.slice(0, visibleCount) : allergens;
  const hiddenCount = allergens.length - visible.length;
  const showModal = hiddenCount > 0;

  return (
    <>
      <p className="mt-1.5 text-xs text-storefront-text-muted">
        <span>{tDefault('guest.menu.allergens', '過敏原')}: </span>
        <span>{visible.join(separator)}</span>
        {showModal ? (
          <>
            <span> +{hiddenCount}</span>
            <button
              type="button"
              aria-label={tDefault('guest.menu.allergenInfo', 'View all allergens')}
              className="ml-1 inline-flex translate-y-px items-center text-storefront-text-muted hover:text-storefront-text"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(true);
              }}
            >
              <Info size={14} />
            </button>
          </>
        ) : null}
      </p>

      {showModal ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {tDefault('guest.menu.allergens', '過敏原')}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-storefront-text-muted">
              {allergens.join(separator)}
            </p>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
