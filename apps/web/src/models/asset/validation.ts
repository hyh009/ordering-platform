import { maxImageSizeBytes, supportedImageMimeTypes } from '@repo/shared';

// Client-side fast-feedback checks so the UI can reject obviously invalid files
// before spending a round trip. Both the accepted formats and the size cap come
// from the shared contract, so they stay in lockstep with the backend (which
// remains the enforcement point).
export { maxImageSizeBytes };
export const acceptedImageMimeTypes = supportedImageMimeTypes;

// `accept` value for the native file input.
export const imageFileInputAccept = acceptedImageMimeTypes.join(',');

export type ImageFileValidationError = 'type' | 'size';

export function validateImageFile(
  file: File,
): { ok: true } | { ok: false; reason: ImageFileValidationError } {
  if (
    !acceptedImageMimeTypes.includes(
      file.type as (typeof acceptedImageMimeTypes)[number],
    )
  ) {
    return { ok: false, reason: 'type' };
  }

  if (file.size > maxImageSizeBytes) {
    return { ok: false, reason: 'size' };
  }

  return { ok: true };
}
