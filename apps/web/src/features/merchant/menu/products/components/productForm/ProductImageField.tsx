import { useCallback, useRef, type ChangeEvent } from 'react';
import { ImageIcon, Trash2, Upload } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import {
  imageFileInputAccept,
  validateImageFile,
  type ImageFileValidationError,
} from '@/models/asset';
import { ImageCropModal } from '@/shared/components/ImageCropModal';
import { Button } from '@/shared/components/ui/button';
import { useImageCrop } from '@/shared/hooks/useImageCrop';
import type { ProductForm } from './useProductForm';

type Props = {
  form: ProductForm;
  onSelect: (file: File) => void;
  onRemove: () => void;
  onInvalidFile: (reason: ImageFileValidationError) => void;
};

export function ProductImageField({
  form,
  onSelect,
  onRemove,
  onInvalidFile,
}: Props) {
  const { tDefault } = useAppTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const value = form.imagePreviewUrl;
  const disabled = form.isSubmitting;

  const crop = useImageCrop();
  const { confirm } = crop;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const result = validateImageFile(file);
    if (!result.ok) {
      onInvalidFile(result.reason);
      return;
    }
    crop.openCrop(file);
  }

  const handleConfirm = useCallback(
    () => confirm(onSelect),
    [confirm, onSelect],
  );

  return (
    <>
      <div className="grid gap-5 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">
          {tDefault('merchant.products.image', 'Image')}
        </h2>

        <div className="flex items-center gap-4">
          <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30">
            {value ? (
              <img alt="" className="h-full w-full object-cover" src={value} />
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
                ? tDefault('merchant.products.imageReplace', 'Replace')
                : tDefault('merchant.products.imageUpload', 'Upload')}
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
