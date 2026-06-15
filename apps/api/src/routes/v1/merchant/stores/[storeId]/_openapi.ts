/**
 * @openapi
 * components:
 *   schemas:
 *     AvailabilityRule:
 *       type: object
 *       properties:
 *         startDate:
 *           type: string
 *           format: date-time
 *           example: "2026-01-01T00:00:00.000Z"
 *         endDate:
 *           type: string
 *           format: date-time
 *           example: "2026-12-31T23:59:59.000Z"
 *         daysOfWeek:
 *           type: array
 *           items:
 *             type: integer
 *             minimum: 0
 *             maximum: 6
 *           example: [1, 2, 3, 4, 5]
 *         timeWindows:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - start
 *               - end
 *             properties:
 *               start:
 *                 type: string
 *                 example: "09:00"
 *               end:
 *                 type: string
 *                 example: "17:00"
 *     UploadedImage:
 *       type: object
 *       required:
 *         - url
 *         - publicId
 *         - width
 *         - height
 *         - format
 *         - bytes
 *       properties:
 *         url:
 *           type: string
 *           format: uri
 *           example: https://res.cloudinary.com/demo/image/upload/latte.png
 *         publicId:
 *           type: string
 *           example: stores/store-123/menu-products/latte
 *         width:
 *           type: integer
 *           example: 800
 *         height:
 *           type: integer
 *           example: 600
 *         format:
 *           type: string
 *           example: png
 *         bytes:
 *           type: integer
 *           example: 20480
 *     UploadImageSuccessResponse:
 *       type: object
 *       required:
 *         - status
 *         - data
 *       properties:
 *         status:
 *           type: string
 *           enum:
 *             - success
 *         data:
 *           type: object
 *           required:
 *             - image
 *           properties:
 *             image:
 *               $ref: '#/components/schemas/UploadedImage'
 */
