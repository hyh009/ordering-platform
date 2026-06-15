import type { UploadedImageDto } from '@repo/shared';
import type { UploadedAsset } from '@src/services/asset.service';

export function toUploadedImageDto(asset: UploadedAsset): UploadedImageDto {
  return {
    url: asset.secureUrl,
    publicId: asset.publicId,
    width: asset.width,
    height: asset.height,
    format: asset.format,
    bytes: asset.bytes,
  };
}
