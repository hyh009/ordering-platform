import {
  createStoreSchema,
  listStoresQuerySchema,
  organizationParamsSchema,
} from '@repo/shared';
import { requireAuth, requireSuperAdmin } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { storeService } from '@src/services/store.service';
import { Router } from 'express';

import type {
  CreateStoreRequest,
  CreateStoreSuccessResponse,
  ListStoresSuccessResponse,
  OrganizationParams,
} from '@repo/shared';

const router = Router({ mergeParams: true });

/**
 * @openapi
 * /v1/admin/organizations/{organizationId}/stores:
 *   post:
 *     tags:
 *       - Admin / Stores
 *     summary: Create a store for an organization
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         example: org-123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - profile
 *               - locale
 *               - operation
 *             properties:
 *               profile:
 *                 type: object
 *                 required:
 *                   - displayName
 *                 properties:
 *                   displayName:
 *                     $ref: '#/components/schemas/LocalizedString'
 *                   description:
 *                     $ref: '#/components/schemas/LocalizedString'
 *               locale:
 *                 type: object
 *                 required:
 *                   - defaultLocale
 *                   - supportedLocales
 *                 properties:
 *                   defaultLocale:
 *                     type: string
 *                     enum: [en, zh-TW]
 *                     example: zh-TW
 *                   supportedLocales:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [en, zh-TW]
 *               operation:
 *                 type: object
 *                 required:
 *                   - businessHours
 *                   - serviceFeeRate
 *                   - orderModes
 *                 properties:
 *                   businessHours:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/BusinessHour'
 *                   serviceFeeRate:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *                     example: 0.1
 *                   orderModes:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/StoreOrderMode'
 *     responses:
 *       201:
 *         description: Store created
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
 *         description: Organization not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post<OrganizationParams, CreateStoreSuccessResponse, CreateStoreRequest>(
  '/',
  requireAuth,
  requireSuperAdmin(),
  validate(organizationParamsSchema, 'params'),
  validate(createStoreSchema),
  async (req, res) => {
    const store = await storeService.createStore({
      organizationId: req.params.organizationId,
      profile: req.body.profile,
      locale: req.body.locale,
      operation: req.body.operation,
    });

    res.status(201).json({ status: 'success', data: { store } });
  },
);

/**
 * @openapi
 * /v1/admin/organizations/{organizationId}/stores:
 *   get:
 *     tags:
 *       - Admin / Stores
 *     summary: List stores for an organization
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         example: org-123
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Stores returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StoreListSuccessResponse'
 *       403:
 *         description: User is not a super admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Organization not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get<
  OrganizationParams,
  ListStoresSuccessResponse,
  Record<string, never>
>(
  '/',
  requireAuth,
  requireSuperAdmin(),
  validate(organizationParamsSchema, 'params'),
  async (req, res) => {
    const query = listStoresQuerySchema.parse(req.query);
    const data = await storeService.listStores(
      req.params.organizationId,
      query,
    );

    res.json({ status: 'success', data });
  },
);

export default router;
