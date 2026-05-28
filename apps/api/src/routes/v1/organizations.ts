import {
  createOrganizationMembershipSchema,
  createOrganizationSchema,
  listOrganizationMembershipsQuerySchema,
  listOrganizationsQuerySchema,
  organizationMembershipParamsSchema,
  organizationParamsSchema,
  updateOrganizationMembershipSchema,
  updateOrganizationSchema,
} from '@repo/shared';
import { requireAuth, requireSuperAdmin } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { organizationService } from '@src/services/organization.service';
import { Router } from 'express';

import type {
  CreateOrganizationMembershipRequest,
  CreateOrganizationMembershipSuccessResponse,
  CreateOrganizationRequest,
  CreateOrganizationSuccessResponse,
  GetOrganizationSuccessResponse,
  ListOrganizationMembershipsSuccessResponse,
  ListOrganizationsSuccessResponse,
  OrganizationMembershipParams,
  OrganizationParams,
  UpdateOrganizationMembershipRequest,
  UpdateOrganizationMembershipSuccessResponse,
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
 *     OrganizationReviewStatus:
 *       type: string
 *       enum:
 *         - pending
 *         - approved
 *         - rejected
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
 *     OrganizationAddress:
 *       type: object
 *       required:
 *         - countryCode
 *         - schemaVersion
 *         - formatted
 *         - tw
 *       properties:
 *         countryCode:
 *           type: string
 *           enum:
 *             - TW
 *         schemaVersion:
 *           type: integer
 *           enum:
 *             - 1
 *         formatted:
 *           type: string
 *           example: "100台北市中正區忠孝西路一段1號"
 *         tw:
 *           type: object
 *           required:
 *             - city
 *             - district
 *             - streetAddress
 *           properties:
 *             postalCode:
 *               type: string
 *               example: "100"
 *             city:
 *               type: string
 *               example: 台北市
 *             district:
 *               type: string
 *               example: 中正區
 *             streetAddress:
 *               type: string
 *               example: 忠孝西路一段1號
 *     OrganizationPhone:
 *       type: object
 *       required:
 *         - countryCode
 *         - e164
 *         - nationalNumber
 *         - type
 *       properties:
 *         countryCode:
 *           type: string
 *           enum:
 *             - TW
 *         e164:
 *           type: string
 *           example: "+886912345678"
 *         nationalNumber:
 *           type: string
 *           example: "0912345678"
 *         type:
 *           type: string
 *           enum:
 *             - mobile
 *             - landline
 *             - toll_free
 *         extension:
 *           type: string
 *           example: "123"
 *     Organization:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - status
 *         - reviewStatus
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           example: org-123
 *         name:
 *           type: string
 *           example: Main Street Cafe
 *         domain:
 *           type: string
 *           example: mainstreet.com
 *         status:
 *           $ref: '#/components/schemas/OrganizationStatus'
 *         reviewStatus:
 *           $ref: '#/components/schemas/OrganizationReviewStatus'
 *         contactEmail:
 *           type: string
 *           format: email
 *           example: ops@example.com
 *         contactPhone:
 *           $ref: '#/components/schemas/OrganizationPhone'
 *         address:
 *           $ref: '#/components/schemas/OrganizationAddress'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2026-05-26T00:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2026-05-26T00:00:00.000Z"
 *     OrganizationListItem:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - status
 *         - reviewStatus
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           example: org-123
 *         name:
 *           type: string
 *           example: Main Street Cafe
 *         domain:
 *           type: string
 *           example: mainstreet.com
 *         status:
 *           $ref: '#/components/schemas/OrganizationStatus'
 *         reviewStatus:
 *           $ref: '#/components/schemas/OrganizationReviewStatus'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2026-05-26T00:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2026-05-26T00:00:00.000Z"
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
 *                 $ref: '#/components/schemas/OrganizationListItem'
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
 *       - in: query
 *         name: keyword
 *         required: false
 *         schema:
 *           type: string
 *         description: Search by organization name or domain
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           $ref: '#/components/schemas/OrganizationStatus'
 *         description: Filter by organization status
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
 *               contactEmail:
 *                 type: string
 *                 format: email
 *                 example: ops@example.com
 *               contactPhone:
 *                 $ref: '#/components/schemas/OrganizationPhone'
 *               address:
 *                 $ref: '#/components/schemas/OrganizationAddress'
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
 *               reviewStatus:
 *                 $ref: '#/components/schemas/OrganizationReviewStatus'
 *               contactEmail:
 *                 type: string
 *                 format: email
 *                 nullable: true
 *                 example: ops@example.com
 *               contactPhone:
 *                 allOf:
 *                   - $ref: '#/components/schemas/OrganizationPhone'
 *                 nullable: true
 *               address:
 *                 allOf:
 *                   - $ref: '#/components/schemas/OrganizationAddress'
 *                 nullable: true
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

router.get<
  OrganizationParams,
  ListOrganizationMembershipsSuccessResponse,
  Record<string, never>
>(
  '/:organizationId/memberships',
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

router.post<
  OrganizationParams,
  CreateOrganizationMembershipSuccessResponse,
  CreateOrganizationMembershipRequest
>(
  '/:organizationId/memberships',
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

router.patch<
  OrganizationMembershipParams,
  UpdateOrganizationMembershipSuccessResponse,
  UpdateOrganizationMembershipRequest
>(
  '/:organizationId/memberships/:membershipId',
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
