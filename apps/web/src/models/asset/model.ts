import type { UploadedImageDto } from '@repo/shared';
import type { UploadedImage } from './types';

export const assetModel = {
  deserialize(dto: UploadedImageDto): UploadedImage {
    return {
      url: dto.url,
      publicId: dto.publicId,
      width: dto.width,
      height: dto.height,
      format: dto.format,
      bytes: dto.bytes,
    };
  },
};
