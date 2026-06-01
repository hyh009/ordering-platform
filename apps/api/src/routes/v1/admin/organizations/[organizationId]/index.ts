import {
  organizationParamsSchema,
  updateOrganizationSchema,
} from '@repo/shared';
import { requireAuth, requireSuperAdmin } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { organizationService } from '@src/services/organization.service';
import { Router } from 'express';

import type {
  GetOrganizationSuccessResponse,
  OrganizationParams,
  UpdateOrganizationRequest,
  UpdateOrganizationSuccessResponse,
} from '@repo/shared';

const router = Router({ mergeParams: true });

/**
 * @openapi
 * /v1/admin/organizations/{organizationId}:
 *   get:
 *     tags:
 *       - Admin / Organizations
 *     summary: Get organization details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         example: org-123
 *     responses:
 *       200:
 *         description: Organization returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrganizationResourceSuccessResponse'
 *       404:
 *         description: Organization not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               organizationNotFound:
 *                 value:
 *                   status: error
 *                   statusCode: 404
 *                   code: ORGANIZATION_NOT_FOUND
 *                   message: Organization not found
 */
router.get<
  OrganizationParams,
  GetOrganizationSuccessResponse,
  Record<string, never>
>(
  '/',
  requireAuth,
  requireSuperAdmin(),
  validate(organizationParamsSchema, 'params'),
  async (req, res) => {
    const organization = await organizationService.getOrganization(
      req.params.organizationId,
    );

    res.json({
      status: 'success',
      data: {
        organization,
      },
    });
  },
);

/**
 * @openapi
 * /v1/admin/organizations/{organizationId}:
 *   patch:
 *     tags:
 *       - Admin / Organizations
 *     summary: Update organization core fields
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: Main Street Cafe
 *               slug:
 *                 type: string
 *                 example: main-street
 *               status:
 *                 $ref: '#/components/schemas/OrganizationStatus'
 *               reviewStatus:
 *                 $ref: '#/components/schemas/OrganizationReviewStatus'
 *               contactEmail:
 *                 type: string
 *                 format: email
 *                 example: ops@example.com
 *               contactPhone:
 *                 $ref: '#/components/schemas/OrganizationPhone'
 *               address:
 *                 $ref: '#/components/schemas/OrganizationAddress'
 *     responses:
 *       200:
 *         description: Organization updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrganizationResourceSuccessResponse'
 *       400:
 *         description: Invalid request body
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
 *             examples:
 *               organizationNotFound:
 *                 value:
 *                   status: error
 *                   statusCode: 404
 *                   code: ORGANIZATION_NOT_FOUND
 *                   message: Organization not found
 */
router.patch<
  OrganizationParams,
  UpdateOrganizationSuccessResponse,
  UpdateOrganizationRequest
>(
  '/',
  requireAuth,
  requireSuperAdmin(),
  validate(organizationParamsSchema, 'params'),
  validate(updateOrganizationSchema),
  async (req, res) => {
    const organization = await organizationService.updateOrganization(
      req.params.organizationId,
      req.body,
    );

    res.json({
      status: 'success',
      data: {
        organization,
      },
    });
  },
);

export default router;
