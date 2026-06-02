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
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2026-05-26T00:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2026-05-26T00:00:00.000Z"
 *     CreateOrganizationRequest:
 *       type: object
 *       required:
 *         - name
 *         - slug
 *         - ownerUserId
 *         - contactEmail
 *         - contactPhone
 *         - address
 *       properties:
 *         name:
 *           type: string
 *           example: Main Street Cafe
 *         slug:
 *           type: string
 *           example: main-street
 *         ownerUserId:
 *           type: string
 *           example: user-123
 *         contactEmail:
 *           type: string
 *           format: email
 *           example: ops@example.com
 *         contactPhone:
 *           $ref: '#/components/schemas/OrganizationPhone'
 *         address:
 *           $ref: '#/components/schemas/OrganizationAddress'
 *     UpdateOrganizationRequest:
 *       type: object
 *       properties:
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
export {};
