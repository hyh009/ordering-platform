import {
  createTagSchema,
  listTagsQuerySchema,
  tagParamsSchema,
  tagStoreParamsSchema,
  updateTagSchema,
} from '@repo/shared';
import { requireAuth, requireOrgRole } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { tagService } from '@src/services/tag.service';
import { Router } from 'express';

import type {
  CreateTagRequest,
  CreateTagSuccessResponse,
  ListTagsSuccessResponse,
  TagParams,
  TagStoreParams,
  UpdateTagRequest,
  UpdateTagSuccessResponse,
} from '@repo/shared';

const router = Router({ mergeParams: true });

/**
 * @openapi
 * components:
 *   schemas:
 *     Tag:
 *       type: object
 *       required:
 *         - id
 *         - storeId
 *         - name
 *         - isActive
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           example: tag-123
 *         storeId:
 *           type: string
 *           example: store-123
 *         name:
 *           $ref: '#/components/schemas/LocalizedMetadataName'
 *         color:
 *           type: string
 *           example: "#1A2B3C"
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     TagListSuccessResponse:
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
 *             - tags
 *           properties:
 *             tags:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tag'
 *     TagResourceSuccessResponse:
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
 *             - tag
 *           properties:
 *             tag:
 *               $ref: '#/components/schemas/Tag'
 */

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/tags:
 *   get:
 *     tags:
 *       - Merchant / Tags
 *     summary: List store tags
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
 *         description: Tags returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagListSuccessResponse'
 */
router.get<TagStoreParams, ListTagsSuccessResponse>(
  '/',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin', 'staff'),
  validate(tagStoreParamsSchema, 'params'),
  async (req, res) => {
    const { isActive } = listTagsQuerySchema.parse(req.query);
    const tags = await tagService.listTags(req.params.storeId, isActive);

    res.json({ status: 'success', data: { tags } });
  },
);

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/tags:
 *   post:
 *     tags:
 *       - Merchant / Tags
 *     summary: Create a store tag
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
 *               color:
 *                 type: string
 *                 example: "#1A2B3C"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Tag created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagResourceSuccessResponse'
 *       404:
 *         description: Store not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post<TagStoreParams, CreateTagSuccessResponse, CreateTagRequest>(
  '/',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin'),
  validate(tagStoreParamsSchema, 'params'),
  validate(createTagSchema),
  async (req, res) => {
    const tag = await tagService.createTag(
      req.params.storeId,
      req.resolvedOrganizationId!,
      req.body,
    );

    res.status(201).json({ status: 'success', data: { tag } });
  },
);

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/tags/{tagId}:
 *   patch:
 *     tags:
 *       - Merchant / Tags
 *     summary: Update a store tag
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
 *         name: tagId
 *         required: true
 *         schema:
 *           type: string
 *         example: tag-123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 $ref: '#/components/schemas/LocalizedMetadataName'
 *               color:
 *                 type: string
 *                 example: "#1A2B3C"
 *               isActive:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Tag updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagResourceSuccessResponse'
 *       404:
 *         description: Tag not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               tagNotFound:
 *                 value:
 *                   status: error
 *                   statusCode: 404
 *                   code: TAG_NOT_FOUND
 *                   message: Tag not found
 */
router.patch<TagParams, UpdateTagSuccessResponse, UpdateTagRequest>(
  '/:tagId',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin'),
  validate(tagParamsSchema, 'params'),
  validate(updateTagSchema),
  async (req, res) => {
    const tag = await tagService.updateTag(
      req.params.storeId,
      req.params.tagId,
      req.body,
    );

    res.json({ status: 'success', data: { tag } });
  },
);

export default router;
