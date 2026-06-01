import { createAssetService } from '@src/services/asset.service';
import { BadRequestError, InternalServerError } from '@src/utils/errors';
import { describe, expect, it, vi } from 'vitest';

import type {
  AssetStorageProvider,
  UploadImageInput,
} from '@src/services/asset.service';

function createUploadInput(
  overrides: Partial<UploadImageInput> = {},
): UploadImageInput {
  return {
    buffer: Buffer.from('image-bytes'),
    mimeType: 'image/png',
    folder: 'stores/store-1/menu-products',
    ...overrides,
  };
}

describe('AssetService', () => {
  it('uploads validated images through the configured storage provider', async () => {
    const storageProvider: AssetStorageProvider = {
      uploadImage: vi.fn().mockResolvedValue({
        provider: 'cloudinary',
        publicId: 'stores/store-1/menu-products/product-1',
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/product-1.png',
        width: 800,
        height: 600,
        format: 'png',
        bytes: 1234,
      }),
    };
    const service = createAssetService(storageProvider);
    const input = createUploadInput();

    await expect(service.uploadImage(input)).resolves.toMatchObject({
      provider: 'cloudinary',
      publicId: 'stores/store-1/menu-products/product-1',
      secureUrl: expect.stringContaining('https://res.cloudinary.com'),
    });
    expect(storageProvider.uploadImage).toHaveBeenCalledWith(input);
  });

  it('rejects unsupported image mime types before calling storage', async () => {
    const storageProvider: AssetStorageProvider = {
      uploadImage: vi.fn(),
    };
    const service = createAssetService(storageProvider);

    await expect(
      service.uploadImage(createUploadInput({ mimeType: 'image/gif' })),
    ).rejects.toBeInstanceOf(BadRequestError);
    expect(storageProvider.uploadImage).not.toHaveBeenCalled();
  });

  it('maps storage failures to an internal server error', async () => {
    const storageProvider: AssetStorageProvider = {
      uploadImage: vi.fn().mockRejectedValue(new Error('upload failed')),
    };
    const service = createAssetService(storageProvider);

    await expect(
      service.uploadImage(createUploadInput()),
    ).rejects.toBeInstanceOf(InternalServerError);
  });
});
