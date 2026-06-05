import {
  createProductSchema,
  listProductsQuerySchema,
  productParamsSchema,
  productStoreParamsSchema,
  toggleProductSoldOutSchema,
  updateProductSchema,
} from '@repo/shared';
import { requireAuth, requireOrgRole } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { productService } from '@src/services/product.service';
import { Router } from 'express';

import type {
  CreateProductRequest,
  CreateProductSuccessResponse,
  ListProductsSuccessResponse,
  ProductParams,
  ProductStoreParams,
  ToggleProductSoldOutRequest,
  ToggleProductSoldOutSuccessResponse,
  UpdateProductRequest,
  UpdateProductSuccessResponse,
} from '@repo/shared';

const router = Router({ mergeParams: true });

/**
 * @openapi
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - id
 *         - storeId
 *         - categoryIds
 *         - name
 *         - price
 *         - tagIds
 *         - allergenIds
 *         - dietaryMarkerIds
 *         - modifierIds
 *         - isActive
 *         - isSoldOut
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           example: product-123
 *         storeId:
 *           type: string
 *           example: store-123
 *         categoryIds:
 *           type: array
 *           items:
 *             type: string
 *           example:
 *             - category-123
 *         name:
 *           $ref: '#/components/schemas/LocalizedMetadataName'
 *         description:
 *           $ref: '#/components/schemas/LocalizedMetadataName'
 *         imageUrl:
 *           type: string
 *           format: uri
 *           example: https://example.com/latte.png
 *         price:
 *           type: number
 *           minimum: 0
 *           example: 120
 *         tagIds:
 *           type: array
 *           items:
 *             type: string
 *         allergenIds:
 *           type: array
 *           items:
 *             type: string
 *         dietaryMarkerIds:
 *           type: array
 *           items:
 *             type: string
 *         modifierIds:
 *           type: array
 *           items:
 *             type: string
 *         isActive:
 *           type: boolean
 *           example: true
 *         isSoldOut:
 *           type: boolean
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ProductListSuccessResponse:
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
 *             - products
 *           properties:
 *             products:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *     ProductResourceSuccessResponse:
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
 *             - product
 *           properties:
 *             product:
 *               $ref: '#/components/schemas/Product'
 */

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/products:
 *   get:
 *     tags:
 *       - Merchant / Products
 *     summary: List store products
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
 *         description: Products returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductListSuccessResponse'
 */
router.get<ProductStoreParams, ListProductsSuccessResponse>(
  '/',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin', 'staff'),
  validate(productStoreParamsSchema, 'params'),
  async (req, res) => {
    const { isActive } = listProductsQuerySchema.parse(req.query);
    const products = await productService.listProducts(
      req.params.storeId,
      isActive,
    );

    res.json({ status: 'success', data: { products } });
  },
);

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/products:
 *   post:
 *     tags:
 *       - Merchant / Products
 *     summary: Create a store product
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
 *               - price
 *             properties:
 *               categoryIds:
 *                 type: array
 *                 description: Omit or send an empty array to leave the product uncategorized.
 *                 items:
 *                   type: string
 *               name:
 *                 $ref: '#/components/schemas/LocalizedMetadataName'
 *               description:
 *                 $ref: '#/components/schemas/LocalizedMetadataName'
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *               price:
 *                 type: number
 *                 minimum: 0
 *               tagIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               allergenIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               dietaryMarkerIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               modifierIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResourceSuccessResponse'
 *       400:
 *         description: Invalid product input or inactive reference
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post<
  ProductStoreParams,
  CreateProductSuccessResponse,
  CreateProductRequest
>(
  '/',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin'),
  validate(productStoreParamsSchema, 'params'),
  validate(createProductSchema),
  async (req, res) => {
    const product = await productService.createProduct(
      req.params.storeId,
      req.resolvedOrganizationId!,
      req.body,
    );

    res.status(201).json({ status: 'success', data: { product } });
  },
);

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/products/{productId}:
 *   patch:
 *     tags:
 *       - Merchant / Products
 *     summary: Update a store product
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
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         example: product-123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categoryIds:
 *                 type: array
 *                 description: Send an empty array to make the product uncategorized.
 *                 items:
 *                   type: string
 *               name:
 *                 $ref: '#/components/schemas/LocalizedMetadataName'
 *               description:
 *                 $ref: '#/components/schemas/LocalizedMetadataName'
 *               imageUrl:
 *                 type: string
 *                 nullable: true
 *                 format: uri
 *               price:
 *                 type: number
 *                 minimum: 0
 *               tagIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               allergenIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               dietaryMarkerIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               modifierIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResourceSuccessResponse'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               productNotFound:
 *                 value:
 *                   status: error
 *                   statusCode: 404
 *                   code: PRODUCT_NOT_FOUND
 *                   message: Product not found
 *       409:
 *         description: Product changed before the update was written
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch<ProductParams, UpdateProductSuccessResponse, UpdateProductRequest>(
  '/:productId',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin'),
  validate(productParamsSchema, 'params'),
  validate(updateProductSchema),
  async (req, res) => {
    const product = await productService.updateProduct(
      req.params.storeId,
      req.params.productId,
      req.body,
    );

    res.json({ status: 'success', data: { product } });
  },
);

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/products/{productId}/sold-out:
 *   patch:
 *     tags:
 *       - Merchant / Products
 *     summary: Toggle product sold-out state
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
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         example: product-123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isSoldOut
 *             properties:
 *               isSoldOut:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product sold-out state updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResourceSuccessResponse'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch<
  ProductParams,
  ToggleProductSoldOutSuccessResponse,
  ToggleProductSoldOutRequest
>(
  '/:productId/sold-out',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin', 'staff'),
  validate(productParamsSchema, 'params'),
  validate(toggleProductSoldOutSchema),
  async (req, res) => {
    const product = await productService.toggleProductSoldOut(
      req.params.storeId,
      req.params.productId,
      req.body,
    );

    res.json({ status: 'success', data: { product } });
  },
);

export default router;
