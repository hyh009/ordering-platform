import { useRef, type ChangeEvent } from 'react';
import { ImageIcon, Trash2, Upload } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { imageFileInputAccept } from '@/models/asset';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/utils/cn';

type StoreImageUploadFieldProps = {
  label: string;
  description: string;
  value: string | undefined;
  // Controls the preview frame: a square-ish logo vs. a wide banner.
  variant: 'logo' | 'banner';
  isBusy: boolean;
  disabled: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
};

export function StoreImageUploadField({
  label,
  description,
  value,
  variant,
  isBusy,
  disabled,
  onSelect,
  onRemove,
}: StoreImageUploadFieldProps) {
  const { tDefault } = useAppTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so selecting the same file again still fires onChange.
    event.target.value = '';
    if (file) onSelect(file);
  }

  return (
    <div className="grid gap-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30',
            variant === 'logo' ? 'h-24 w-24' : 'h-24 w-48',
          )}
        >
          {value ? (
            <img
              alt={label}
              className="h-full w-full object-cover"
              src={value}
            />
          ) : (
            <ImageIcon
              aria-hidden
              className="h-8 w-8 text-muted-foreground/50"
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            accept={imageFileInputAccept}
            className="hidden"
            disabled={disabled || isBusy}
            type="file"
            onChange={handleChange}
          />
          <Button
            className="gap-2"
            disabled={disabled || isBusy}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            <Upload aria-hidden className="h-4 w-4" />
            {isBusy
              ? tDefault('common.actions.uploading', 'Uploading...')
              : value
                ? tDefault(
                    'merchant.storeSettings.branding.replace',
                    'Replace',
                  )
                : tDefault('merchant.storeSettings.branding.upload', 'Upload')}
          </Button>
          {value && (
            <Button
              className="gap-2 text-destructive hover:text-destructive"
              disabled={disabled || isBusy}
              size="sm"
              type="button"
              variant="ghost"
              onClick={onRemove}
            >
              <Trash2 aria-hidden className="h-4 w-4" />
              {tDefault('common.actions.remove', 'Remove')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
