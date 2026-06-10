import { requireAuth } from '@src/middlewares/auth';
import { metadataService } from '@src/services/metadata.service';
import { Router } from 'express';

import type { ListDietaryMarkersSuccessResponse } from '@repo/shared';

const router = Router();

/**
 * @openapi
 * /v1/merchant/metadata/dietary-markers:
 *   get:
 *     tags:
 *       - Merchant / Metadata
 *     summary: List active dietary markers for merchant product authoring
 *     description: >
 *       Read-only dietary marker reference data for any authenticated merchant
 *       user. Only active dietary markers are returned. Managing dietary markers
 *       stays under the super-admin surface.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active dietary markers returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DietaryMarkerListSuccessResponse'
 */
router.get<Record<string, never>, ListDietaryMarkersSuccessResponse>(
  '/',
  requireAuth,
  async (_req, res) => {
    const dietaryMarkers = await metadataService.listDietaryMarkers('true');

    res.json({
      status: 'success',
      data: {
        dietaryMarkers,
      },
    });
  },
);

export default router;
