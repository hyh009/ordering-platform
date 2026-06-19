import { useAppTranslation } from '@/app/i18n';
import type { SupportedLanguage } from '@/app/i18n/languages';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

interface StorefrontLanguageDialogProps {
  open: boolean;
  options: Array<{ label: string; value: SupportedLanguage }>;
  onSelect: (lang: SupportedLanguage) => void;
  onOpenChange: (open: boolean) => void;
}

export function StorefrontLanguageDialog({
  open,
  options,
  onSelect,
  onOpenChange,
}: StorefrontLanguageDialogProps) {
  const { tDefault } = useAppTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {tDefault('guest.language.selectTitle', 'Choose your language')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-1">
          {options.map((opt) => (
            <Button
              key={opt.value}
              className="w-full"
              variant="outline"
              onClick={() => onSelect(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
