import { useState, useCallback, useRef, useEffect } from 'react';
import type { Point, Area } from 'react-easy-crop';
import { presentClientError } from '@/app/global/feedback/presentClientError';
import { tDefault } from '@/app/i18n';
import { cropImageToFile } from '@/shared/utils/cropImageToFile';

export function useImageCrop() {
  const sourceFileRef = useRef<File | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [sourceObjectUrl, setSourceObjectUrl] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const openCrop = useCallback((file: File) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    sourceFileRef.current = file;
    setSourceObjectUrl(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setIsOpen(true);
  }, []);

  const closeCrop = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    sourceFileRef.current = null;
    setSourceObjectUrl(null);
    setIsOpen(false);
  }, []);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const confirm = useCallback(
    async (onSuccess: (file: File) => void) => {
      if (!sourceFileRef.current || !objectUrlRef.current || !croppedAreaPixels)
        return;
      setIsConfirming(true);
      try {
        const croppedFile = await cropImageToFile(
          objectUrlRef.current,
          croppedAreaPixels,
          sourceFileRef.current,
        );
        onSuccess(croppedFile);
        closeCrop();
      } catch {
        // Client-side crop failure (canvas/decode/toBlob). Keep the modal open
        // so the user can retry; surface it as a non-command client error.
        presentClientError(
          tDefault('common.imageCropFailed', 'Could not process the image.'),
        );
      } finally {
        setIsConfirming(false);
      }
    },
    [croppedAreaPixels, closeCrop],
  );

  return {
    sourceObjectUrl,
    isOpen,
    crop,
    setCrop,
    zoom,
    setZoom,
    onCropComplete,
    isConfirming,
    canConfirm: croppedAreaPixels !== null,
    openCrop,
    closeCrop,
    confirm,
  };
}
