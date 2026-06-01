/**
 * @openapi
 * components:
 *   schemas:
 *     OrganizationMembershipWithUser:
 *       allOf:
 *         - $ref: '#/components/schemas/OrganizationMembership'
 *         - type: object
 *           required:
 *             - userEmail
 *             - userUsername
 *           properties:
 *             userEmail:
 *               type: string
 *               format: email
 *               example: owner@example.com
 *             userUsername:
 *               type: string
 *               example: owner-user
 *     OrganizationMembershipListSuccessResponse:
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
 *             - memberships
 *             - pagination
 *           properties:
 *             memberships:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/OrganizationMembershipWithUser'
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
 *                   example: 3
 *     OrganizationMembershipResourceSuccessResponse:
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
 *             - membership
 *           properties:
 *             membership:
 *               $ref: '#/components/schemas/OrganizationMembershipWithUser'
 */
export {};
