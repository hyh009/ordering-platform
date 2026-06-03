import { listMerchantStoresQuerySchema } from '@repo/shared';
import { requireAuth } from '@src/middlewares/auth';
import { organizationMembershipRepository } from '@src/repositories/organizationMembership/repository';
import { storeService } from '@src/services/store.service';
import { ERROR_CODES } from '@src/utils/errorCode';
import { ForbiddenError } from '@src/utils/errors';
import { Router } from 'express';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { organizationId, offset, limit } = listMerchantStoresQuerySchema.parse(
    req.query,
  );

  const membership =
    await organizationMembershipRepository.findByUserAndOrganization(
      req.user!.id,
      organizationId,
    );

  if (!membership || membership.status !== 'active') {
    throw new ForbiddenError('Access denied', ERROR_CODES.FORBIDDEN);
  }

  const result = await storeService.listStores(organizationId, {
    offset,
    limit,
  });

  res.json({ status: 'success', data: result });
});

export default router;
