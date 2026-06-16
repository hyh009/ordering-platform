import { z } from 'zod';

import type { ApiSuccessResponse } from './api.js';

/**
 * Result of uploading an image to the configured asset storage provider.
 * `url` is the canonical secure URL clients persist (e.g. into product
 * imageUrls or store logo/banner fields).
 */
export type UploadedImageDto = {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

export type UploadImageSuccessResponse = ApiSuccessResponse<{
  image: UploadedImageDto;
}>;

/**
 * Image upload constraints shared by the API asset service and the web upload
 * UI so both agree on accepted formats and the size cap. The API remains the
 * enforcement point; the web uses these for pre-upload validation only.
 */
export const supportedImageMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

export type SupportedImageMimeType = (typeof supportedImageMimeTypes)[number];

export const maxImageSizeBytes = 5 * 1024 * 1024;

export const storeImageKinds = ['logo', 'banner'] as const;

export const uploadStoreImageSchema = z.object({
  kind: z.enum(storeImageKinds),
});

export type UploadStoreImageRequest = z.infer<typeof uploadStoreImageSchema>;
