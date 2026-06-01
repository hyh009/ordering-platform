import {
  organizationMembershipParamsSchema,
  updateOrganizationMembershipSchema,
} from '@repo/shared';
import { requireAuth, requireSuperAdmin } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { organizationService } from '@src/services/organization.service';
import { Router } from 'express';

import type {
  OrganizationMembershipParams,
  UpdateOrganizationMembershipRequest,
  UpdateOrganizationMembershipSuccessResponse,
} from '@repo/shared';

const router = Router({ mergeParams: true });

/**
 * @openapi
 * /v1/admin/organizations/{organizationId}/memberships/{membershipId}:
 *   patch:
 *     tags:
 *       - Admin / Organization Memberships
 *     summary: Update an organization membership
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         example: org-123
 *       - in: path
 *         name: membershipId
 *         required: true
 *         schema:
 *           type: string
 *         example: org-membership-123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 $ref: '#/components/schemas/OrganizationMembershipRole'
 *               status:
 *                 $ref: '#/components/schemas/OrganizationMembershipStatus'
 *     responses:
 *       200:
 *         description: Organization membership updated
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
 *         description: Organization or membership not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               membershipNotFound:
 *                 value:
 *                   status: error
 *                   statusCode: 404
 *                   code: ORGANIZATION_MEMBERSHIP_NOT_FOUND
 *                   message: Organization membership not found
 */
router.patch<
  OrganizationMembershipParams,
  UpdateOrganizationMembershipSuccessResponse,
  UpdateOrganizationMembershipRequest
>(
  '/',
  requireAuth,
  requireSuperAdmin(),
  validate(organizationMembershipParamsSchema, 'params'),
  validate(updateOrganizationMembershipSchema),
  async (req, res) => {
    const membership = await organizationService.updateOrganizationMembership(
      req.params.organizationId,
      req.params.membershipId,
      req.body,
    );

    res.json({ status: 'success', data: { membership } });
  },
);

export default router;
