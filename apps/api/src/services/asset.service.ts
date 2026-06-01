import { cloudinaryClient } from '@src/config/cloudinary';
import { ERROR_CODES } from '@src/utils/errorCode';
import { BadRequestError, InternalServerError } from '@src/utils/errors';

import type {
  UploadApiErrorResponse,
  UploadApiOptions,
  UploadApiResponse,
} from 'cloudinary';

const allowedImageMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

const maxImageSizeBytes = 5 * 1024 * 1024;
const storageFolderPattern = /^[a-zA-Z0-9][a-zA-Z0-9/_-]*$/;

export type AssetProvider = 'cloudinary';

export type UploadedAsset = {
  provider: AssetProvider;
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

export type UploadImageInput = {
  buffer: Buffer;
  mimeType: string;
  folder: string;
  publicId?: string | undefined;
  overwrite?: boolean | undefined;
  tags?: string[] | undefined;
};

export type AssetStorageProvider = {
  uploadImage(input: UploadImageInput): Promise<UploadedAsset>;
};

function assertValidImageInput(input: UploadImageInput) {
  if (
    !allowedImageMimeTypes.includes(
      input.mimeType as (typeof allowedImageMimeTypes)[number],
    )
  ) {
    throw new BadRequestError(
      'Unsupported image type',
      ERROR_CODES.INVALID_FIELD_VALUE,
    );
  }

  if (input.buffer.length === 0) {
    throw new BadRequestError(
      'Image file is required',
      ERROR_CODES.BAD_REQUEST,
    );
  }

  if (input.buffer.length > maxImageSizeBytes) {
    throw new BadRequestError(
      'Image file is too large',
      ERROR_CODES.INVALID_FIELD_VALUE,
    );
  }

  if (!storageFolderPattern.test(input.folder)) {
    throw new BadRequestError(
      'Invalid asset folder',
      ERROR_CODES.INVALID_FIELD_VALUE,
    );
  }
}

function toUploadedAsset(result: UploadApiResponse): UploadedAsset {
  return {
    provider: 'cloudinary',
    publicId: result.public_id,
    secureUrl: result.secure_url,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

function uploadBufferToCloudinary(
  buffer: Buffer,
  options: UploadApiOptions,
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinaryClient.uploader.upload_stream(
      options,
      (
        error: UploadApiErrorResponse | undefined,
        result: UploadApiResponse | undefined,
      ) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result) {
          reject(new Error('Cloudinary upload completed without a result'));
          return;
        }

        resolve(result);
      },
    );

    uploadStream.on('error', reject);
    uploadStream.end(buffer);
  });
}

export const cloudinaryAssetStorage: AssetStorageProvider = {
  async uploadImage(input) {
    const options: UploadApiOptions = {
      folder: input.folder,
      resource_type: 'image',
      overwrite: input.overwrite ?? false,
      unique_filename: input.publicId === undefined,
      use_filename: false,
    };

    if (input.publicId !== undefined) {
      options.public_id = input.publicId;
    }

    if (input.tags !== undefined) {
      options.tags = input.tags;
    }

    const result = await uploadBufferToCloudinary(input.buffer, options);

    return toUploadedAsset(result);
  },
};

export class AssetService {
  public constructor(
    private readonly storageProvider: AssetStorageProvider = cloudinaryAssetStorage,
  ) {}

  public async uploadImage(input: UploadImageInput): Promise<UploadedAsset> {
    assertValidImageInput(input);

    try {
      return await this.storageProvider.uploadImage(input);
    } catch {
      throw new InternalServerError(
        'Image upload failed',
        ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

export function createAssetService(storageProvider?: AssetStorageProvider) {
  return new AssetService(storageProvider);
}

export const assetService = createAssetService();
