import {
  createDietaryMarkerSchema,
  dietaryMarkerParamsSchema,
  metadataActiveFilterSchema,
  updateDietaryMarkerSchema,
} from '@repo/shared';
import { requireAuth, requireSuperAdmin } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { metadataService } from '@src/services/metadata.service';
import { Router } from 'express';

import type {
  CreateDietaryMarkerRequest,
  CreateDietaryMarkerSuccessResponse,
  DietaryMarkerParams,
  ListDietaryMarkersSuccessResponse,
  MetadataActiveFilter,
  UpdateDietaryMarkerRequest,
  UpdateDietaryMarkerSuccessResponse,
} from '@repo/shared';

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     DietaryMarkerType:
 *       type: string
 *       enum:
 *         - dietary
 *         - regulatory
 *     DietaryMarker:
 *       type: object
 *       required:
 *         - id
 *         - key
 *         - name
 *         - type
 *         - isActive
 *       properties:
 *         id:
 *           type: string
 *           example: dietary-marker-123
 *         key:
 *           type: string
 *           example: vegetarian
 *         name:
 *           $ref: '#/components/schemas/LocalizedMetadataName'
 *         icon:
 *           type: string
 *           example: leaf
 *         type:
 *           $ref: '#/components/schemas/DietaryMarkerType'
 *         isActive:
 *           type: boolean
 *           example: true
 *     DietaryMarkerListSuccessResponse:
 *       type: object
 *       required:
 *         - status
 *         - data
 *       properties:
 *         status:
 *           type: string
 *           enum:
 *             - success
 *           example: success
 *         data:
 *           type: object
 *           required:
 *             - dietaryMarkers
 *           properties:
 *             dietaryMarkers:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DietaryMarker'
 *     DietaryMarkerResourceSuccessResponse:
 *       type: object
 *       required:
 *         - status
 *         - data
 *       properties:
 *         status:
 *           type: string
 *           enum:
 *             - success
 *           example: success
 *         data:
 *           type: object
 *           required:
 *             - dietaryMarker
 *           properties:
 *             dietaryMarker:
 *               $ref: '#/components/schemas/DietaryMarker'
 */

/**
 * @openapi
 * /v1/admin/dietary-markers:
 *   get:
 *     tags:
 *       - Dietary Markers
 *     summary: List dietary markers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - "true"
 *             - "false"
 *             - all
 *           default: "true"
 *     responses:
 *       200:
 *         description: Dietary markers returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DietaryMarkerListSuccessResponse'
 */
router.get<
  Record<string, never>,
  ListDietaryMarkersSuccessResponse,
  Record<string, never>,
  { isActive: MetadataActiveFilter }
>('/', requireAuth, requireSuperAdmin(), async (req, res) => {
  const query = metadataActiveFilterSchema.parse(req.query);
  const dietaryMarkers = await metadataService.listDietaryMarkers(
    query.isActive,
  );

  res.json({
    status: 'success',
    data: {
      dietaryMarkers,
    },
  });
});

/**
 * @openapi
 * /v1/admin/dietary-markers:
 *   post:
 *     tags:
 *       - Dietary Markers
 *     summary: Create a dietary marker
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - key
 *               - name
 *             properties:
 *               key:
 *                 type: string
 *                 example: vegetarian
 *               name:
 *                 $ref: '#/components/schemas/LocalizedMetadataName'
 *               icon:
 *                 type: string
 *                 example: leaf
 *               type:
 *                 $ref: '#/components/schemas/DietaryMarkerType'
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Dietary marker created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DietaryMarkerResourceSuccessResponse'
 *       409:
 *         description: Dietary marker key already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               dietaryMarkerAlreadyExists:
 *                 value:
 *                   status: error
 *                   statusCode: 409
 *                   code: DIETARY_MARKER_ALREADY_EXISTS
 *                   message: Dietary marker already exists
 */
router.post<
  Record<string, never>,
  CreateDietaryMarkerSuccessResponse,
  CreateDietaryMarkerRequest
>(
  '/',
  requireAuth,
  requireSuperAdmin(),
  validate(createDietaryMarkerSchema),
  async (req, res) => {
    const dietaryMarker = await metadataService.createDietaryMarker(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        dietaryMarker,
      },
    });
  },
);

/**
 * @openapi
 * /v1/admin/dietary-markers/{dietaryMarkerId}:
 *   patch:
 *     tags:
 *       - Dietary Markers
 *     summary: Update dietary marker metadata
 *     description: The dietary marker key is create-only and cannot be updated here.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dietaryMarkerId
 *         required: true
 *         schema:
 *           type: string
 *         example: dietary-marker-123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 $ref: '#/components/schemas/LocalizedMetadataName'
 *               icon:
 *                 type: string
 *                 nullable: true
 *                 example: leaf
 *               type:
 *                 $ref: '#/components/schemas/DietaryMarkerType'
 *               isActive:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Dietary marker updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DietaryMarkerResourceSuccessResponse'
 *       404:
 *         description: Dietary marker not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               dietaryMarkerNotFound:
 *                 value:
 *                   status: error
 *                   statusCode: 404
 *                   code: DIETARY_MARKER_NOT_FOUND
 *                   message: Dietary marker not found
 */
router.patch<
  DietaryMarkerParams,
  UpdateDietaryMarkerSuccessResponse,
  UpdateDietaryMarkerRequest
>(
  '/:dietaryMarkerId',
  requireAuth,
  requireSuperAdmin(),
  validate(dietaryMarkerParamsSchema, 'params'),
  validate(updateDietaryMarkerSchema),
  async (req, res) => {
    const dietaryMarker = await metadataService.updateDietaryMarker(
      req.params.dietaryMarkerId,
      req.body,
    );

    res.json({
      status: 'success',
      data: {
        dietaryMarker,
      },
    });
  },
);

export default router;
