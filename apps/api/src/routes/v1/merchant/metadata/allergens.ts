import { requireAuth } from '@src/middlewares/auth';
import { metadataService } from '@src/services/metadata.service';
import { Router } from 'express';

import type { ListAllergensSuccessResponse } from '@repo/shared';

const router = Router();

/**
 * @openapi
 * /v1/merchant/metadata/allergens:
 *   get:
 *     tags:
 *       - Merchant / Metadata
 *     summary: List active allergens for merchant product authoring
 *     description: >
 *       Read-only allergen reference data for any authenticated merchant user.
 *       Only active allergens are returned. Managing allergens stays under the
 *       super-admin surface.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active allergens returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AllergenListSuccessResponse'
 */
router.get<Record<string, never>, ListAllergensSuccessResponse>(
  '/',
  requireAuth,
  async (_req, res) => {
    const allergens = await metadataService.listAllergens('true');

    res.json({
      status: 'success',
      data: {
        allergens,
      },
    });
  },
);

export default router;
