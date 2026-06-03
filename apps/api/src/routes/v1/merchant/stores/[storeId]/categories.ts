import {
  categoryParamsSchema,
  categoryStoreParamsSchema,
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from '@repo/shared';
import { requireAuth, requireOrgRole } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { categoryService } from '@src/services/category.service';
import { Router } from 'express';

import type {
  CategoryParams,
  CategoryStoreParams,
  CreateCategoryRequest,
  CreateCategorySuccessResponse,
  ListCategoriesSuccessResponse,
  UpdateCategoryRequest,
  UpdateCategorySuccessResponse,
} from '@repo/shared';

const router = Router({ mergeParams: true });

/**
 * @openapi
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       required:
 *         - id
 *         - storeId
 *         - name
 *         - displayOrder
 *         - isActive
 *         - availabilityRules
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           example: category-123
 *         storeId:
 *           type: string
 *           example: store-123
 *         name:
 *           $ref: '#/components/schemas/LocalizedMetadataName'
 *         description:
 *           $ref: '#/components/schemas/LocalizedMetadataName'
 *         imageUrl:
 *           type: string
 *           format: uri
 *           example: https://res.cloudinary.com/demo/image/upload/category.jpg
 *         displayOrder:
 *           type: integer
 *           minimum: 0
 *           example: 10
 *         isActive:
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
 *                       example: "09:00"
 *                     end:
 *                       type: string
 *                       example: "17:00"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CategoryListSuccessResponse:
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
 *             - categories
 *           properties:
 *             categories:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 *     CategoryResourceSuccessResponse:
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
 *             - category
 *           properties:
 *             category:
 *               $ref: '#/components/schemas/Category'
 */

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/categories:
 *   get:
 *     tags:
 *       - Merchant / Categories
 *     summary: List store categories
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
 *         description: Categories returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryListSuccessResponse'
 */
router.get<CategoryStoreParams, ListCategoriesSuccessResponse>(
  '/',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin', 'staff'),
  validate(categoryStoreParamsSchema, 'params'),
  async (req, res) => {
    const { isActive } = listCategoriesQuerySchema.parse(req.query);
    const categories = await categoryService.listCategories(
      req.params.storeId,
      isActive,
    );

    res.json({ status: 'success', data: { categories } });
  },
);

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/categories:
 *   post:
 *     tags:
 *       - Merchant / Categories
 *     summary: Create a store category
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
 *             properties:
 *               name:
 *                 $ref: '#/components/schemas/LocalizedMetadataName'
 *               description:
 *                 $ref: '#/components/schemas/LocalizedMetadataName'
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *               displayOrder:
 *                 type: integer
 *                 minimum: 0
 *               isActive:
 *                 type: boolean
 *               availabilityRules:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/AvailabilityRule'
 *     responses:
 *       201:
 *         description: Category created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryResourceSuccessResponse'
 */
router.post<
  CategoryStoreParams,
  CreateCategorySuccessResponse,
  CreateCategoryRequest
>(
  '/',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin'),
  validate(categoryStoreParamsSchema, 'params'),
  validate(createCategorySchema),
  async (req, res) => {
    const category = await categoryService.createCategory(
      req.params.storeId,
      req.resolvedOrganizationId!,
      req.body,
    );

    res.status(201).json({ status: 'success', data: { category } });
  },
);

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/categories/{categoryId}:
 *   patch:
 *     tags:
 *       - Merchant / Categories
 *     summary: Update a store category
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
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         example: category-123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 $ref: '#/components/schemas/LocalizedMetadataName'
 *               description:
 *                 $ref: '#/components/schemas/LocalizedMetadataName'
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *               displayOrder:
 *                 type: integer
 *                 minimum: 0
 *               isActive:
 *                 type: boolean
 *               availabilityRules:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/AvailabilityRule'
 *     responses:
 *       200:
 *         description: Category updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryResourceSuccessResponse'
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               categoryNotFound:
 *                 value:
 *                   status: error
 *                   statusCode: 404
 *                   code: CATEGORY_NOT_FOUND
 *                   message: Category not found
 */
router.patch<
  CategoryParams,
  UpdateCategorySuccessResponse,
  UpdateCategoryRequest
>(
  '/:categoryId',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin'),
  validate(categoryParamsSchema, 'params'),
  validate(updateCategorySchema),
  async (req, res) => {
    const category = await categoryService.updateCategory(
      req.params.storeId,
      req.params.categoryId,
      req.body,
    );

    res.json({ status: 'success', data: { category } });
  },
);

export default router;
