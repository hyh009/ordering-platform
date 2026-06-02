import {
  createOrganizationSchema,
  listOrganizationsQuerySchema,
} from '@repo/shared';
import { requireAuth, requireSuperAdmin } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { organizationService } from '@src/services/organization.service';
import { Router } from 'express';

import type {
  CreateOrganizationRequest,
  CreateOrganizationSuccessResponse,
  ListOrganizationsSuccessResponse,
} from '@repo/shared';

const router = Router();

/**
 * @openapi
 * /v1/admin/organizations:
 *   get:
 *     tags:
 *       - Admin / Organizations
 *     summary: List organizations
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: keyword
 *         required: false
 *         schema:
 *           type: string
 *         description: Search by organization name or slug
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           $ref: '#/components/schemas/OrganizationStatus'
 *         description: Filter by organization status
 *       - in: query
 *         name: reviewStatus
 *         required: false
 *         schema:
 *           $ref: '#/components/schemas/OrganizationReviewStatus'
 *         description: Filter by organization review status
 *       - in: query
 *         name: sortBy
 *         required: false
 *         schema:
 *           type: string
 *           enum: [name, createdAt, updatedAt]
 *           default: createdAt
 *       - in: query
 *         name: sortDirection
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Organizations returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrganizationListSuccessResponse'
 *       403:
 *         description: User is not a super admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               forbidden:
 *                 value:
 *                   status: error
 *                   statusCode: 403
 *                   code: FORBIDDEN
 *                   message: Insufficient platform permissions
 */
router.get<
  Record<string, never>,
  ListOrganizationsSuccessResponse,
  Record<string, never>
>('/', requireAuth, requireSuperAdmin(), async (req, res) => {
  const query = listOrganizationsQuerySchema.parse(req.query);
  const data = await organizationService.listOrganizations(query);

  res.json({
    status: 'success',
    data,
  });
});

/**
 * @openapi
 * /v1/admin/organizations:
 *   post:
 *     tags:
 *       - Admin / Organizations
 *     summary: Create an organization and assign an existing user as owner
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrganizationRequest'
 *     responses:
 *       201:
 *         description: Organization created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateOrganizationSuccessResponse'
 *       403:
 *         description: User is not a super admin or owner user is disabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Owner user was not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post<
  Record<string, never>,
  CreateOrganizationSuccessResponse,
  CreateOrganizationRequest
>(
  '/',
  requireAuth,
  requireSuperAdmin(),
  validate(createOrganizationSchema),
  async (req, res) => {
    const result = await organizationService.createOrganization(req.body);

    res.status(201).json({
      status: 'success',
      data: result,
    });
  },
);

export default router;
