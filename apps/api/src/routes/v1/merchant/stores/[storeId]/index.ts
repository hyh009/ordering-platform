import {
  storeParamsSchema,
  updateStoreSchema,
  uploadStoreImageSchema,
} from '@repo/shared';
import { requireAuth, requireOrgRole } from '@src/middlewares/auth';
import { singleImageUpload, uploadRequestImage } from '@src/middlewares/upload';
import { validate } from '@src/middlewares/validate';
import { storeService } from '@src/services/store.service';
import { Router } from 'express';

import type {
  GetStoreSuccessResponse,
  StoreParams,
  UpdateStoreRequest,
  UpdateStoreSuccessResponse,
  UploadImageSuccessResponse,
  UploadStoreImageRequest,
} from '@repo/shared';

const router = Router({ mergeParams: true });

router.get<StoreParams, GetStoreSuccessResponse, Record<string, never>>(
  '/',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin', 'staff'),
  validate(storeParamsSchema, 'params'),
  async (req, res) => {
    const store = await storeService.getStore(req.params.storeId);

    res.json({ status: 'success', data: { store } });
  },
);

router.patch<StoreParams, UpdateStoreSuccessResponse, UpdateStoreRequest>(
  '/',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin'),
  validate(storeParamsSchema, 'params'),
  validate(updateStoreSchema),
  async (req, res) => {
    const store = await storeService.updateStore(
      req.params.storeId,
      req.resolvedOrganizationId!,
      req.body,
    );

    res.json({ status: 'success', data: { store } });
  },
);

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/images:
 *   post:
 *     tags:
 *       - Merchant / Stores
 *     summary: Upload a store logo or banner image
 *     description: >-
 *       Uploads a single branding image and returns its hosted URL. Persist the
 *       returned url into the store via PATCH /v1/merchant/stores/{storeId}
 *       using profile.logoUrl or profile.bannerUrl.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         example: store-123
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - kind
 *               - file
 *             properties:
 *               kind:
 *                 type: string
 *                 enum:
 *                   - logo
 *                   - banner
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image file (jpeg, png, webp, or avif; max 5 MB).
 *     responses:
 *       201:
 *         description: Image uploaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadImageSuccessResponse'
 *       400:
 *         description: Missing kind, missing/oversized/unsupported image file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post<StoreParams, UploadImageSuccessResponse, UploadStoreImageRequest>(
  '/images',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin'),
  validate(storeParamsSchema, 'params'),
  // multer must run first so the multipart `kind` text field is on req.body
  // before validate parses it.
  singleImageUpload(),
  validate(uploadStoreImageSchema),
  async (req, res) => {
    const image = await uploadRequestImage(req.file, {
      folder: `stores/${req.params.storeId}/branding`,
      // A store has at most one logo and one banner; reuse a stable public id so
      // re-uploads overwrite the previous file instead of accumulating assets.
      publicId: req.body.kind,
      overwrite: true,
    });

    res.status(201).json({ status: 'success', data: { image } });
  },
);

export default router;
