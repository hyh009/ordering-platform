import {
  createOrganizationMembershipSchema,
  createOrganizationSchema,
  createStoreSchema,
  listOrganizationMembershipsQuerySchema,
  listOrganizationsQuerySchema,
  listStoresQuerySchema,
  organizationMembershipParamsSchema,
  organizationParamsSchema,
  storeWithOrgParamsSchema,
  updateOrganizationMembershipSchema,
  updateOrganizationSchema,
  updateStoreSchema,
} from '@repo/shared';
import { requireAuth, requireSuperAdmin } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { organizationService } from '@src/services/organization.service';
import { storeService } from '@src/services/store.service';
import { ERROR_CODES } from '@src/utils/errorCode';
import { NotFoundError } from '@src/utils/errors';
import { Router } from 'express';

import type {
  CreateOrganizationMembershipRequest,
  CreateOrganizationMembershipSuccessResponse,
  CreateOrganizationRequest,
  CreateOrganizationSuccessResponse,
  CreateStoreRequest,
  CreateStoreSuccessResponse,
  GetOrganizationSuccessResponse,
  GetStoreSuccessResponse,
  ListOrganizationMembershipsSuccessResponse,
  ListOrganizationsSuccessResponse,
  ListStoresSuccessResponse,
  OrganizationMembershipParams,
  OrganizationParams,
  StoreWithOrgParams,
  UpdateOrganizationMembershipRequest,
  UpdateOrganizationMembershipSuccessResponse,
  UpdateOrganizationRequest,
  UpdateOrganizationSuccessResponse,
  UpdateStoreRequest,
  UpdateStoreSuccessResponse,
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
 *         - slug
 *         - status
 *         - reviewStatus
 *         - contactEmail
 *         - contactPhone
 *         - address
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           example: org-123
 *         name:
 *           type: string
 *           example: Main Street Cafe
 *         slug:
 *           type: string
 *           example: main-street
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
 *         - slug
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
 *         slug:
 *           type: string
 *           example: main-street
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
 *         description: Search by organization name or slug
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
 *               - slug
 *               - ownerUserId
 *               - contactEmail
 *               - contactPhone
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *                 example: Main Street Cafe
 *               slug:
 *                 type: string
 *                 example: main-street
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

// ── Store sub-routes (super admin) ────────────────────────────────────────────

router.post<OrganizationParams, CreateStoreSuccessResponse, CreateStoreRequest>(
  '/:organizationId/stores',
  requireAuth,
  requireSuperAdmin(),
  validate(organizationParamsSchema, 'params'),
  validate(createStoreSchema),
  async (req, res) => {
    const store = await storeService.createStore({
      organizationId: req.params.organizationId,
      profile: req.body.profile,
      locale: req.body.locale,
      operation: req.body.operation,
    });

    res.status(201).json({ status: 'success', data: { store } });
  },
);

router.get<OrganizationParams, ListStoresSuccessResponse, Record<string, never>>(
  '/:organizationId/stores',
  requireAuth,
  requireSuperAdmin(),
  validate(organizationParamsSchema, 'params'),
  async (req, res) => {
    const query = listStoresQuerySchema.parse(req.query);
    const data = await storeService.listStores(req.params.organizationId, query);

    res.json({ status: 'success', data });
  },
);

router.get<StoreWithOrgParams, GetStoreSuccessResponse, Record<string, never>>(
  '/:organizationId/stores/:storeId',
  requireAuth,
  requireSuperAdmin(),
  validate(storeWithOrgParamsSchema, 'params'),
  async (req, res) => {
    const store = await storeService.getStore(req.params.storeId);

    if (store.organizationId !== req.params.organizationId) {
      throw new NotFoundError('Store not found', ERROR_CODES.STORE_NOT_FOUND);
    }

    res.json({ status: 'success', data: { store } });
  },
);

router.patch<StoreWithOrgParams, UpdateStoreSuccessResponse, UpdateStoreRequest>(
  '/:organizationId/stores/:storeId',
  requireAuth,
  requireSuperAdmin(),
  validate(storeWithOrgParamsSchema, 'params'),
  validate(updateStoreSchema),
  async (req, res) => {
    const store = await storeService.updateStore(
      req.params.storeId,
      req.params.organizationId,
      req.body,
    );

    res.json({ status: 'success', data: { store } });
  },
);

export default router;
