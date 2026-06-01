import {
  createOrganizationMembershipSchema,
  listOrganizationMembershipsQuerySchema,
  organizationParamsSchema,
} from '@repo/shared';
import { requireAuth, requireSuperAdmin } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { organizationService } from '@src/services/organization.service';
import { Router } from 'express';

import type {
  CreateOrganizationMembershipRequest,
  CreateOrganizationMembershipSuccessResponse,
  ListOrganizationMembershipsSuccessResponse,
  OrganizationParams,
} from '@repo/shared';

const router = Router({ mergeParams: true });

/**
 * @openapi
 * /v1/admin/organizations/{organizationId}/memberships:
 *   get:
 *     tags:
 *       - Admin / Organization Memberships
 *     summary: List organization memberships
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         example: org-123
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Organization memberships returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrganizationMembershipListSuccessResponse'
 *       403:
 *         description: User is not a super admin
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
router.get<
  OrganizationParams,
  ListOrganizationMembershipsSuccessResponse,
  Record<string, never>
>(
  '/',
  requireAuth,
  requireSuperAdmin(),
  validate(organizationParamsSchema, 'params'),
  async (req, res) => {
    const query = listOrganizationMembershipsQuerySchema.parse(req.query);
    const data = await organizationService.listOrganizationMemberships(
      req.params.organizationId,
      query,
    );

    res.json({ status: 'success', data });
  },
);

/**
 * @openapi
 * /v1/admin/organizations/{organizationId}/memberships:
 *   post:
 *     tags:
 *       - Admin / Organization Memberships
 *     summary: Create a user and add them as an organization member
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
 *             required:
 *               - email
 *               - username
 *               - temporaryPassword
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: staff@example.com
 *               username:
 *                 type: string
 *                 example: staff-user
 *               temporaryPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: Password123
 *               role:
 *                 $ref: '#/components/schemas/OrganizationMembershipRole'
 *     responses:
 *       201:
 *         description: Organization member created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrganizationMembershipResourceSuccessResponse'
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: User is not a super admin
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
 *       409:
 *         description: User or organization membership already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post<
  OrganizationParams,
  CreateOrganizationMembershipSuccessResponse,
  CreateOrganizationMembershipRequest
>(
  '/',
  requireAuth,
  requireSuperAdmin(),
  validate(organizationParamsSchema, 'params'),
  validate(createOrganizationMembershipSchema),
  async (req, res) => {
    const membership = await organizationService.addOrganizationMember(
      req.params.organizationId,
      req.body,
    );

    res.status(201).json({ status: 'success', data: { membership } });
  },
);

export default router;
