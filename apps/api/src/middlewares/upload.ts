import { toUploadedImageDto } from '@src/models/asset/mapper';
import { assetService, maxImageSizeBytes } from '@src/services/asset.service';
import { ERROR_CODES } from '@src/utils/errorCode';
import { BadRequestError } from '@src/utils/errors';
import multer, { MulterError } from 'multer';

import type { UploadedImageDto } from '@repo/shared';
import type { NextFunction, Request, Response } from 'express';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxImageSizeBytes, files: 1 },
});

function toUploadError(error: MulterError): BadRequestError {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new BadRequestError(
      'Image file is too large',
      ERROR_CODES.INVALID_FIELD_VALUE,
    );
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new BadRequestError(
      'Unexpected file field',
      ERROR_CODES.INVALID_FIELD_VALUE,
    );
  }

  return new BadRequestError('Invalid file upload', ERROR_CODES.BAD_REQUEST);
}

/**
 * Parses a single multipart `file` field into `req.file` (memory buffer) and
 * maps multer's own errors onto the platform's BadRequestError so the central
 * error handler returns a consistent envelope.
 */
export function singleImageUpload(field = 'file') {
  const handler = upload.single(field);

  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (error: unknown) => {
      if (error instanceof MulterError) {
        next(toUploadError(error));
        return;
      }

      if (error) {
        next(error);
        return;
      }

      next();
    });
  };
}

/**
 * Uploads a parsed multipart image to the asset store and returns its public
 * DTO. Shared by routes that accept an image upload; callers pass only the
 * storage options that differ between them.
 */
export async function uploadRequestImage(
  file: Express.Multer.File | undefined,
  options: { folder: string; publicId?: string; overwrite?: boolean },
): Promise<UploadedImageDto> {
  if (!file) {
    throw new BadRequestError(
      'Image file is required',
      ERROR_CODES.BAD_REQUEST,
    );
  }

  const asset = await assetService.uploadImage({
    buffer: file.buffer,
    mimeType: file.mimetype,
    folder: options.folder,
    publicId: options.publicId,
    overwrite: options.overwrite,
  });

  return toUploadedImageDto(asset);
}
