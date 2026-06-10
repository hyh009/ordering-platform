import { storeParamsSchema } from '@repo/shared';
import { validate } from '@src/middlewares/validate';
import {
  getPublicMenu,
  getPublicStore,
} from '@src/services/publicStore.service';
import { Router } from 'express';

import type {
  GetPublicMenuSuccessResponse,
  GetPublicStoreSuccessResponse,
  StoreParams,
} from '@repo/shared';

const router = Router({ mergeParams: true });

/**
 * @openapi
 * /v1/public/stores/{storeId}:
 *   get:
 *     tags:
 *       - Public / Stores
 *     summary: Get guest-facing store info
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Public store info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     store:
 *                       $ref: '#/components/schemas/PublicStore'
 *       404:
 *         description: Store not found or disabled
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
router.get('/', validate(storeParamsSchema, 'params'), async (req, res) => {
  const { storeId } = req.params as StoreParams;
  const store = await getPublicStore(storeId);

  const response: GetPublicStoreSuccessResponse = {
    status: 'success',
    data: { store },
  };
  res.status(200).json(response);
});

/**
 * @openapi
 * /v1/public/stores/{storeId}/menu:
 *   get:
 *     tags:
 *       - Public / Stores
 *     summary: Get the guest-facing menu
 *     description: >
 *       Returns published, active products with their categories, modifiers,
 *       and referenced allergen/dietary metadata. Merchant-only fields are
 *       omitted.
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Public menu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     menu:
 *                       $ref: '#/components/schemas/PublicMenu'
 *       404:
 *         description: Store not found or disabled
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
router.get('/menu', validate(storeParamsSchema, 'params'), async (req, res) => {
  const { storeId } = req.params as StoreParams;
  const menu = await getPublicMenu(storeId);

  const response: GetPublicMenuSuccessResponse = {
    status: 'success',
    data: { menu },
  };
  res.status(200).json(response);
});

export default router;
