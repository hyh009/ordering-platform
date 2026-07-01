import { useCallback, useRef, type ChangeEvent } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { presentClientError } from '@/app/global/feedback/presentClientError';
import {
  getImageFileValidationMessage,
  imageFileInputAccept,
  validateImageFile,
} from '@/models/asset';
import { ImageCropModal } from '@/shared/components/ImageCropModal';
import { Button } from '@/shared/components/ui/button';
import { useImageCrop } from '@/shared/hooks/useImageCrop';
import { StoreImageFrame } from './StoreImageFrame';

type StoreImageUploadFieldProps = {
  label: string;
  description: string;
  value: string | undefined;
  // Controls the preview frame: a square-ish logo vs. a wide banner.
  variant: 'logo' | 'banner';
  // Crop aspect ratio (width / height): square logo vs. wide banner.
  aspect: number;
  disabled: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
};

export function StoreImageUploadField({
  label,
  description,
  value,
  variant,
  aspect,
  disabled,
  onSelect,
  onRemove,
}: StoreImageUploadFieldProps) {
  const { tDefault } = useAppTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const crop = useImageCrop();
  const { confirm } = crop;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so selecting the same file again still fires onChange.
    event.target.value = '';
    if (!file) return;
    const result = validateImageFile(file);
    if (!result.ok) {
      presentClientError(getImageFileValidationMessage(result.reason, tDefault));
      return;
    }
    crop.openCrop(file);
  }

  // Hand the cropped file to the page; it is staged locally and uploaded on save.
  const handleConfirm = useCallback(() => confirm(onSelect), [confirm, onSelect]);

  return (
    <>
      <div className="grid gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>

        <div className="flex items-center gap-4">
          <StoreImageFrame alt={label} value={value} variant={variant} />

          <div className="flex flex-col gap-2">
            <input
              ref={inputRef}
              accept={imageFileInputAccept}
              className="hidden"
              disabled={disabled}
              type="file"
              onChange={handleChange}
            />
            <Button
              className="gap-2"
              disabled={disabled}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
            >
              <Upload aria-hidden className="h-4 w-4" />
              {value
                ? tDefault('merchant.storeSettings.branding.replace', 'Replace')
                : tDefault('merchant.storeSettings.branding.upload', 'Upload')}
            </Button>
            {value && (
              <Button
                className="gap-2 text-destructive hover:text-destructive"
                disabled={disabled}
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

      <ImageCropModal
        open={crop.isOpen}
        imageSrc={crop.sourceObjectUrl ?? ''}
        crop={crop.crop}
        zoom={crop.zoom}
        aspect={aspect}
        onCropChange={crop.setCrop}
        onZoomChange={crop.setZoom}
        onCropComplete={crop.onCropComplete}
        onConfirm={handleConfirm}
        onCancel={crop.closeCrop}
        isConfirming={crop.isConfirming}
        canConfirm={crop.canConfirm}
      />
    </>
  );
}
