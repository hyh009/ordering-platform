import { listUsersQuerySchema } from '@repo/shared';
import { requireAuth, requireSuperAdmin } from '@src/middlewares/auth';
import { userService } from '@src/services/user.service';
import { Router } from 'express';

import type { ListUsersSuccessResponse } from '@repo/shared';

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     UserListItem:
 *       type: object
 *       required:
 *         - id
 *         - email
 *         - username
 *         - status
 *       properties:
 *         id:
 *           type: string
 *           example: user-123
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         username:
 *           type: string
 *           example: platform-user
 *         status:
 *           type: string
 *           enum:
 *             - active
 *             - disabled
 *           example: active
 *     UserListSuccessResponse:
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
 *             - users
 *             - pagination
 *           properties:
 *             users:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserListItem'
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
 * /v1/admin/users:
 *   get:
 *     tags:
 *       - Admin / Users
 *     summary: List active platform users
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
 *         description: Search by user email or username
 *     responses:
 *       200:
 *         description: Users returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserListSuccessResponse'
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
  ListUsersSuccessResponse,
  Record<string, never>
>('/', requireAuth, requireSuperAdmin(), async (req, res) => {
  const query = listUsersQuerySchema.parse(req.query);
  const data = await userService.listUsers(query);

  res.json({
    status: 'success',
    data,
  });
});

export default router;
