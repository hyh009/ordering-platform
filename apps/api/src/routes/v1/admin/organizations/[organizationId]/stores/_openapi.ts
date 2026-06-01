/**
 * @openapi
 * components:
 *   schemas:
 *     StoreStatus:
 *       type: string
 *       enum:
 *         - active
 *         - disabled
 *     StoreCheckoutMode:
 *       type: string
 *       enum:
 *         - pay_first
 *         - pay_later
 *     StoreOrderType:
 *       type: string
 *       enum:
 *         - dine_in
 *         - takeaway
 *     BusinessHour:
 *       type: object
 *       required:
 *         - dayOfWeek
 *         - isOpen
 *       properties:
 *         dayOfWeek:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *           example: 1
 *         isOpen:
 *           type: boolean
 *           example: true
 *         openTime:
 *           type: string
 *           example: "09:00"
 *         closeTime:
 *           type: string
 *           example: "18:00"
 *     StoreOrderMode:
 *       type: object
 *       required:
 *         - type
 *         - isEnabled
 *         - checkoutMode
 *       properties:
 *         type:
 *           $ref: '#/components/schemas/StoreOrderType'
 *         isEnabled:
 *           type: boolean
 *           example: true
 *         checkoutMode:
 *           $ref: '#/components/schemas/StoreCheckoutMode'
 *     LocalizedString:
 *       type: object
 *       properties:
 *         en:
 *           type: string
 *           example: Main Street Cafe
 *         zh-TW:
 *           type: string
 *           example: 主街咖啡
 *     Store:
 *       type: object
 *       required:
 *         - id
 *         - organizationId
 *         - profile
 *         - locale
 *         - operation
 *         - status
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           example: store-123
 *         organizationId:
 *           type: string
 *           example: org-123
 *         profile:
 *           type: object
 *           required:
 *             - displayName
 *           properties:
 *             displayName:
 *               $ref: '#/components/schemas/LocalizedString'
 *             description:
 *               $ref: '#/components/schemas/LocalizedString'
 *         locale:
 *           type: object
 *           required:
 *             - defaultLocale
 *             - supportedLocales
 *           properties:
 *             defaultLocale:
 *               type: string
 *               enum:
 *                 - en
 *                 - zh-TW
 *               example: zh-TW
 *             supportedLocales:
 *               type: array
 *               items:
 *                 type: string
 *                 enum:
 *                   - en
 *                   - zh-TW
 *               example:
 *                 - zh-TW
 *                 - en
 *         operation:
 *           type: object
 *           required:
 *             - businessHours
 *             - serviceFeeRate
 *             - orderModes
 *           properties:
 *             businessHours:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BusinessHour'
 *             serviceFeeRate:
 *               type: number
 *               minimum: 0
 *               maximum: 1
 *               example: 0.1
 *             orderModes:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StoreOrderMode'
 *         status:
 *           $ref: '#/components/schemas/StoreStatus'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2026-05-26T00:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2026-05-26T00:00:00.000Z"
 *     StoreResourceSuccessResponse:
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
 *             - store
 *           properties:
 *             store:
 *               $ref: '#/components/schemas/Store'
 *     StoreListSuccessResponse:
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
 *             - stores
 *             - pagination
 *           properties:
 *             stores:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Store'
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
 *                   example: 2
 */
export {};
