import { storeWithOrgParamsSchema, updateStoreSchema } from '@repo/shared';
import { requireAuth, requireSuperAdmin } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { storeService } from '@src/services/store.service';
import { ERROR_CODES } from '@src/utils/errorCode';
import { NotFoundError } from '@src/utils/errors';
import { Router } from 'express';

import type {
  GetStoreSuccessResponse,
  StoreWithOrgParams,
  UpdateStoreRequest,
  UpdateStoreSuccessResponse,
} from '@repo/shared';

const router = Router({ mergeParams: true });

/**
 * @openapi
 * /v1/admin/organizations/{organizationId}/stores/{storeId}:
 *   get:
 *     tags:
 *       - Admin / Stores
 *     summary: Get a store for an organization
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         example: org-123
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         example: store-123
 *     responses:
 *       200:
 *         description: Store returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StoreResourceSuccessResponse'
 *       403:
 *         description: User is not a super admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Store not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               storeNotFound:
 *                 value:
 *                   status: error
 *                   statusCode: 404
 *                   code: STORE_NOT_FOUND
 *                   message: Store not found
 */
router.get<StoreWithOrgParams, GetStoreSuccessResponse, Record<string, never>>(
  '/',
  requireAuth,
  requireSuperAdmin(),
  validate(storeWithOrgParamsSchema, 'params'),
  async (req, res) => {
    const store = await storeService.getStore(req.params.storeId);

    if (store.organizationId !== req.params.organizationId) {
      throw new NotFoundError('Store not found', ERROR_CODES.STORE_NOT_FOUND);
    }

    res.json({ status: 'success', data: { store } });
  },
);

/**
 * @openapi
 * /v1/admin/organizations/{organizationId}/stores/{storeId}:
 *   patch:
 *     tags:
 *       - Admin / Stores
 *     summary: Update a store for an organization
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         example: org-123
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         example: store-123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profile:
 *                 type: object
 *                 properties:
 *                   displayName:
 *                     $ref: '#/components/schemas/LocalizedString'
 *                   description:
 *                     $ref: '#/components/schemas/LocalizedString'
 *               locale:
 *                 type: object
 *                 properties:
 *                   defaultLocale:
 *                     type: string
 *                     enum: [en, zh-TW]
 *                   supportedLocales:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [en, zh-TW]
 *               operation:
 *                 type: object
 *                 properties:
 *                   businessHours:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/BusinessHour'
 *                   serviceFeeRate:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *                   orderModes:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/StoreOrderMode'
 *               status:
 *                 $ref: '#/components/schemas/StoreStatus'
 *     responses:
 *       200:
 *         description: Store updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StoreResourceSuccessResponse'
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: User is not a super admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Store not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch<
  StoreWithOrgParams,
  UpdateStoreSuccessResponse,
  UpdateStoreRequest
>(
  '/',
  requireAuth,
  requireSuperAdmin(),
  validate(storeWithOrgParamsSchema, 'params'),
  validate(updateStoreSchema),
  async (req, res) => {
    const store = await storeService.updateStore(
      req.params.storeId,
      req.params.organizationId,
      req.body,
    );

    res.json({ status: 'success', data: { store } });
  },
);

export default router;
