import { useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';
import { useAppTranslation } from '@/app/i18n';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

type Props = {
  open: boolean;
  imageSrc: string;
  crop: Point;
  zoom: number;
  onCropChange: (point: Point) => void;
  onZoomChange: (zoom: number) => void;
  onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
  /** Whether the crop area is ready. Defaults to true. */
  canConfirm?: boolean;
  /** Crop aspect ratio (width / height). Defaults to 1 (square). */
  aspect?: number;
};

export function ImageCropModal({
  open,
  imageSrc,
  crop,
  zoom,
  onCropChange,
  onZoomChange,
  onCropComplete,
  onConfirm,
  onCancel,
  isConfirming = false,
  canConfirm = true,
  aspect = 1,
}: Props) {
  const { tDefault } = useAppTranslation();

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) onCancel();
    },
    [onCancel],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {tDefault('common.imageCrop.title', 'Crop Image')}
          </DialogTitle>
        </DialogHeader>

        <div className="relative h-72 w-full overflow-hidden rounded-md bg-muted">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={onCropChange}
              onCropComplete={onCropComplete}
              onZoomChange={onZoomChange}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={isConfirming} onClick={onCancel}>
            {tDefault('common.actions.cancel', 'Cancel')}
          </Button>
          <Button disabled={isConfirming || !canConfirm} onClick={onConfirm}>
            {tDefault('common.actions.confirm', 'Confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
