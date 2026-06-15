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

export const storeImageKinds = ['logo', 'banner'] as const;

export const uploadStoreImageSchema = z.object({
  kind: z.enum(storeImageKinds),
});

export type UploadStoreImageRequest = z.infer<typeof uploadStoreImageSchema>;
