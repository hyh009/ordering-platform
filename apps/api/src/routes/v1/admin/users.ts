import { listUsersQuerySchema } from '@repo/shared';
import { requireAuth, requireSuperAdmin } from '@src/middlewares/auth';
import { userService } from '@src/services/user.service';
import { Router } from 'express';

import type { ListUsersSuccessResponse } from '@repo/shared';

const router = Router();

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
