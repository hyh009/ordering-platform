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
 */
