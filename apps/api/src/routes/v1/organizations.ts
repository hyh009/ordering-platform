import { createOrganizationSchema } from '@repo/shared';
import { requireAuth, requireSuperAdmin } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { organizationService } from '@src/services/organization.service';
import { Router } from 'express';

import type {
  CreateOrganizationRequest,
  CreateOrganizationSuccessResponse,
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
 */

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

export default router;
