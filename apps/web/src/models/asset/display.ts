import type { AppTranslator } from '@/app/i18n';
import type { ImageFileValidationError } from './validation';

export function getImageFileValidationMessage(
  reason: ImageFileValidationError,
  tDefault: AppTranslator,
) {
  switch (reason) {
    case 'size':
      return tDefault(
        'asset.imageUpload.fileTooLarge',
        'Image must be 5 MB or smaller.',
      );
    case 'type':
      return tDefault(
        'asset.imageUpload.unsupportedType',
        'Use a JPEG, PNG, WebP, or AVIF image.',
      );
  }
}
