import {
  allergenParamsSchema,
  createAllergenSchema,
  metadataActiveFilterSchema,
  updateAllergenSchema,
} from '@repo/shared';
import { requireAuth, requireSuperAdmin } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { metadataService } from '@src/services/metadata.service';
import { Router } from 'express';

import type {
  AllergenParams,
  CreateAllergenRequest,
  CreateAllergenSuccessResponse,
  ListAllergensSuccessResponse,
  MetadataActiveFilter,
  UpdateAllergenRequest,
  UpdateAllergenSuccessResponse,
} from '@repo/shared';

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     LocalizedMetadataName:
 *       type: object
 *       required:
 *         - zh-TW
 *       properties:
 *         en:
 *           type: string
 *           example: Peanut
 *         zh-TW:
 *           type: string
 *           example: 花生
 *     Allergen:
 *       type: object
 *       required:
 *         - id
 *         - key
 *         - name
 *         - isActive
 *       properties:
 *         id:
 *           type: string
 *           example: allergen-123
 *         key:
 *           type: string
 *           example: peanut
 *         name:
 *           $ref: '#/components/schemas/LocalizedMetadataName'
 *         icon:
 *           type: string
 *           example: nut
 *         isActive:
 *           type: boolean
 *           example: true
 *     AllergenListSuccessResponse:
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
 *             - allergens
 *           properties:
 *             allergens:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Allergen'
 *     AllergenResourceSuccessResponse:
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
 *             - allergen
 *           properties:
 *             allergen:
 *               $ref: '#/components/schemas/Allergen'
 */

/**
 * @openapi
 * /v1/allergens:
 *   get:
 *     tags:
 *       - Allergens
 *     summary: List allergens
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
 *         description: Allergens returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AllergenListSuccessResponse'
 */
router.get<
  Record<string, never>,
  ListAllergensSuccessResponse,
  Record<string, never>,
  { isActive: MetadataActiveFilter }
>('/', requireAuth, requireSuperAdmin(), async (req, res) => {
  const query = metadataActiveFilterSchema.parse(req.query);
  const allergens = await metadataService.listAllergens(query.isActive);

  res.json({
    status: 'success',
    data: {
      allergens,
    },
  });
});

/**
 * @openapi
 * /v1/allergens:
 *   post:
 *     tags:
 *       - Allergens
 *     summary: Create an allergen
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
 *                 example: peanut
 *               name:
 *                 $ref: '#/components/schemas/LocalizedMetadataName'
 *               icon:
 *                 type: string
 *                 example: nut
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Allergen created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AllergenResourceSuccessResponse'
 *       409:
 *         description: Allergen key already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               allergenAlreadyExists:
 *                 value:
 *                   status: error
 *                   statusCode: 409
 *                   code: ALLERGEN_ALREADY_EXISTS
 *                   message: Allergen already exists
 */
router.post<
  Record<string, never>,
  CreateAllergenSuccessResponse,
  CreateAllergenRequest
>(
  '/',
  requireAuth,
  requireSuperAdmin(),
  validate(createAllergenSchema),
  async (req, res) => {
    const allergen = await metadataService.createAllergen(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        allergen,
      },
    });
  },
);

/**
 * @openapi
 * /v1/allergens/{allergenId}:
 *   patch:
 *     tags:
 *       - Allergens
 *     summary: Update allergen metadata
 *     description: The allergen key is create-only and cannot be updated here.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: allergenId
 *         required: true
 *         schema:
 *           type: string
 *         example: allergen-123
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
 *                 example: nut
 *               isActive:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Allergen updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AllergenResourceSuccessResponse'
 *       404:
 *         description: Allergen not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               allergenNotFound:
 *                 value:
 *                   status: error
 *                   statusCode: 404
 *                   code: ALLERGEN_NOT_FOUND
 *                   message: Allergen not found
 */
router.patch<
  AllergenParams,
  UpdateAllergenSuccessResponse,
  UpdateAllergenRequest
>(
  '/:allergenId',
  requireAuth,
  requireSuperAdmin(),
  validate(allergenParamsSchema, 'params'),
  validate(updateAllergenSchema),
  async (req, res) => {
    const allergen = await metadataService.updateAllergen(
      req.params.allergenId,
      req.body,
    );

    res.json({
      status: 'success',
      data: {
        allergen,
      },
    });
  },
);

export default router;
