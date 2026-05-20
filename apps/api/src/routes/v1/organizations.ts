import {
  createOrganizationSchema,
  listOrganizationsQuerySchema,
  organizationParamsSchema,
  updateOrganizationSchema,
} from '@repo/shared';
import { requireAuth, requireSuperAdmin } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { organizationService } from '@src/services/organization.service';
import { Router } from 'express';

import type {
  CreateOrganizationRequest,
  CreateOrganizationSuccessResponse,
  GetOrganizationSuccessResponse,
  ListOrganizationsSuccessResponse,
  OrganizationParams,
  UpdateOrganizationRequest,
  UpdateOrganizationSuccessResponse,
} from '@repo/shared';

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     OrganizationStatus:
 *       type: string
 *       enum:
 *         - active
 *         - disabled
 *     OrganizationMembershipRole:
 *       type: string
 *       enum:
 *         - org_owner
 *         - org_admin
 *         - staff
 *     OrganizationMembershipStatus:
 *       type: string
 *       enum:
 *         - active
 *         - disabled
 *     Organization:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - status
 *       properties:
 *         id:
 *           type: string
 *           example: org-123
 *         name:
 *           type: string
 *           example: Main Street Cafe
 *         status:
 *           $ref: '#/components/schemas/OrganizationStatus'
 *     OrganizationMembership:
 *       type: object
 *       required:
 *         - id
 *         - organizationId
 *         - userId
 *         - role
 *         - status
 *       properties:
 *         id:
 *           type: string
 *           example: org-membership-123
 *         organizationId:
 *           type: string
 *           example: org-123
 *         userId:
 *           type: string
 *           example: user-123
 *         role:
 *           $ref: '#/components/schemas/OrganizationMembershipRole'
 *         status:
 *           $ref: '#/components/schemas/OrganizationMembershipStatus'
 *     CreateOrganizationSuccessResponse:
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
 *             - organization
 *             - ownerMembership
 *           properties:
 *             organization:
 *               $ref: '#/components/schemas/Organization'
 *             ownerMembership:
 *               $ref: '#/components/schemas/OrganizationMembership'
 *     OrganizationResourceSuccessResponse:
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
 *             - organization
 *           properties:
 *             organization:
 *               $ref: '#/components/schemas/Organization'
 *     OrganizationListSuccessResponse:
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
 *             - organizations
 *             - pagination
 *           properties:
 *             organizations:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Organization'
 *             pagination:
 *               type: object
 *               required:
 *                 - offset
 *                 - limit
 *                 - total
 *               properties:
 *                 offset:
 *                   type: integer
 *                   minimum: 0
 *                   example: 0
 *                 limit:
 *                   type: integer
 *                   minimum: 1
 *                   maximum: 100
 *                   example: 20
 *                 total:
 *                   type: integer
 *                   minimum: 0
 *                   example: 42
 */

/**
 * @openapi
 * /v1/organizations:
 *   get:
 *     tags:
 *       - Organizations
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
 * /v1/organizations:
 *   post:
 *     tags:
 *       - Organizations
 *     summary: Create an organization and assign an existing user as owner
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - ownerUserId
 *             properties:
 *               name:
 *                 type: string
 *                 example: Main Street Cafe
 *               ownerUserId:
 *                 type: string
 *                 example: user-123
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

/**
 * @openapi
 * /v1/organizations/{organizationId}:
 *   get:
 *     tags:
 *       - Organizations
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
  '/:organizationId',
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
 * /v1/organizations/{organizationId}:
 *   patch:
 *     tags:
 *       - Organizations
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
 *               status:
 *                 $ref: '#/components/schemas/OrganizationStatus'
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
  '/:organizationId',
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
