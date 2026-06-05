import {
  createProductModifierSchema,
  listProductModifiersQuerySchema,
  productModifierParamsSchema,
  productModifierStoreParamsSchema,
  updateProductModifierSchema,
} from '@repo/shared';
import { requireAuth, requireOrgRole } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { productModifierService } from '@src/services/productModifier.service';
import { Router } from 'express';

import type {
  CreateProductModifierRequest,
  CreateProductModifierSuccessResponse,
  GetProductModifierSuccessResponse,
  ListProductModifiersSuccessResponse,
  ProductModifierParams,
  ProductModifierStoreParams,
  UpdateProductModifierRequest,
  UpdateProductModifierSuccessResponse,
} from '@repo/shared';

const router = Router({ mergeParams: true });

/**
 * @openapi
 * components:
 *   schemas:
 *     ProductModifierOptionInput:
 *       type: object
 *       required:
 *         - name
 *         - priceAdjustment
 *       properties:
 *         id:
 *           type: string
 *           description: Include to update an existing option; omit for new options (ignored on create).
 *           example: product-modifier-option-abc123
 *         sharedOptionCode:
 *           type: string
 *           example: oat-milk
 *         name:
 *           $ref: '#/components/schemas/LocalizedMetadataName'
 *         priceAdjustment:
 *           type: number
 *           example: 15
 *         isDefault:
 *           type: boolean
 *           example: false
 *         isActive:
 *           type: boolean
 *           example: true
 *         isSoldOut:
 *           type: boolean
 *           example: false
 *     ProductModifierOption:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - priceAdjustment
 *         - isDefault
 *         - isActive
 *         - isSoldOut
 *       properties:
 *         id:
 *           type: string
 *           example: product-modifier-option-abc123
 *         sharedOptionCode:
 *           type: string
 *           example: oat-milk
 *         name:
 *           $ref: '#/components/schemas/LocalizedMetadataName'
 *         priceAdjustment:
 *           type: number
 *           example: 15
 *         isDefault:
 *           type: boolean
 *           example: false
 *         isActive:
 *           type: boolean
 *           example: true
 *         isSoldOut:
 *           type: boolean
 *           example: false
 *     ProductModifier:
 *       type: object
 *       required:
 *         - id
 *         - storeId
 *         - name
 *         - selectionType
 *         - minSelect
 *         - maxSelect
 *         - options
 *         - inheritCategoryAvailability
 *         - availabilityRules
 *         - isActive
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           example: product-modifier-123
 *         storeId:
 *           type: string
 *           example: store-123
 *         name:
 *           $ref: '#/components/schemas/LocalizedMetadataName'
 *         selectionType:
 *           type: string
 *           enum:
 *             - single_choice
 *             - multiple_choice
 *         minSelect:
 *           type: integer
 *           minimum: 0
 *           example: 0
 *         maxSelect:
 *           type: integer
 *           minimum: 1
 *           example: 2
 *         options:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductModifierOption'
 *         inheritCategoryAvailability:
 *           type: boolean
 *           example: true
 *         availabilityRules:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               daysOfWeek:
 *                 type: array
 *                 items:
 *                   type: integer
 *                   minimum: 0
 *                   maximum: 6
 *               timeWindows:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - start
 *                     - end
 *                   properties:
 *                     start:
 *                       type: string
 *                     end:
 *                       type: string
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ProductModifierListSuccessResponse:
 *       type: object
 *       required:
 *         - status
 *         - data
 *       properties:
 *         status:
 *           type: string
 *           enum:
 *             - success
 *         data:
 *           type: object
 *           required:
 *             - productModifiers
 *           properties:
 *             productModifiers:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProductModifier'
 *     ProductModifierResourceSuccessResponse:
 *       type: object
 *       required:
 *         - status
 *         - data
 *       properties:
 *         status:
 *           type: string
 *           enum:
 *             - success
 *         data:
 *           type: object
 *           required:
 *             - productModifier
 *           properties:
 *             productModifier:
 *               $ref: '#/components/schemas/ProductModifier'
 */

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/product-modifiers:
 *   get:
 *     tags:
 *       - Merchant / Product Modifiers
 *     summary: List store product modifiers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         example: store-123
 *       - in: query
 *         name: isActive
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - "true"
 *             - "false"
 *             - all
 *           default: all
 *     responses:
 *       200:
 *         description: Product modifiers returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductModifierListSuccessResponse'
 */

router.get<ProductModifierStoreParams, ListProductModifiersSuccessResponse>(
  '/',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin', 'staff'),
  validate(productModifierStoreParamsSchema, 'params'),
  async (req, res) => {
    const { isActive } = listProductModifiersQuerySchema.parse(req.query);
    const productModifiers = await productModifierService.listProductModifiers(
      req.params.storeId,
      isActive,
    );

    res.json({ status: 'success', data: { productModifiers } });
  },
);

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/product-modifiers:
 *   post:
 *     tags:
 *       - Merchant / Product Modifiers
 *     summary: Create a store product modifier
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
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - selectionType
 *               - minSelect
 *               - maxSelect
 *               - options
 *             properties:
 *               name:
 *                 $ref: '#/components/schemas/LocalizedMetadataName'
 *               selectionType:
 *                 type: string
 *                 enum:
 *                   - single_choice
 *                   - multiple_choice
 *               minSelect:
 *                 type: integer
 *                 minimum: 0
 *               maxSelect:
 *                 type: integer
 *                 minimum: 1
 *               options:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ProductModifierOptionInput'
 *               inheritCategoryAvailability:
 *                 type: boolean
 *               availabilityRules:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/AvailabilityRule'
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Product modifier created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductModifierResourceSuccessResponse'
 */
router.post<
  ProductModifierStoreParams,
  CreateProductModifierSuccessResponse,
  CreateProductModifierRequest
>(
  '/',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin'),
  validate(productModifierStoreParamsSchema, 'params'),
  validate(createProductModifierSchema),
  async (req, res) => {
    const productModifier = await productModifierService.createProductModifier(
      req.params.storeId,
      req.resolvedOrganizationId!,
      req.body,
    );

    res.status(201).json({ status: 'success', data: { productModifier } });
  },
);

router.get<ProductModifierParams, GetProductModifierSuccessResponse>(
  '/:productModifierId',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin', 'staff'),
  validate(productModifierParamsSchema, 'params'),
  async (req, res) => {
    const productModifier = await productModifierService.getProductModifier(
      req.params.storeId,
      req.params.productModifierId,
    );

    res.json({ status: 'success', data: { productModifier } });
  },
);

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/product-modifiers/{productModifierId}:
 *   patch:
 *     tags:
 *       - Merchant / Product Modifiers
 *     summary: Update a store product modifier
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         example: store-123
 *       - in: path
 *         name: productModifierId
 *         required: true
 *         schema:
 *           type: string
 *         example: product-modifier-123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 $ref: '#/components/schemas/LocalizedMetadataName'
 *               selectionType:
 *                 type: string
 *                 enum:
 *                   - single_choice
 *                   - multiple_choice
 *               minSelect:
 *                 type: integer
 *                 minimum: 0
 *               maxSelect:
 *                 type: integer
 *                 minimum: 1
 *               options:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ProductModifierOptionInput'
 *               inheritCategoryAvailability:
 *                 type: boolean
 *               availabilityRules:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/AvailabilityRule'
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product modifier updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductModifierResourceSuccessResponse'
 *       404:
 *         description: Product modifier not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               productModifierNotFound:
 *                 value:
 *                   status: error
 *                   statusCode: 404
 *                   code: PRODUCT_MODIFIER_NOT_FOUND
 *                   message: Product modifier not found
 */
router.patch<
  ProductModifierParams,
  UpdateProductModifierSuccessResponse,
  UpdateProductModifierRequest
>(
  '/:productModifierId',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin'),
  validate(productModifierParamsSchema, 'params'),
  validate(updateProductModifierSchema),
  async (req, res) => {
    const productModifier = await productModifierService.updateProductModifier(
      req.params.storeId,
      req.params.productModifierId,
      req.body,
    );

    res.json({ status: 'success', data: { productModifier } });
  },
);

export default router;
