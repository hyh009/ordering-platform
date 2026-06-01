import {
  listMerchantStoresQuerySchema,
  storeParamsSchema,
  updateStoreSchema,
} from '@repo/shared';
import { requireAuth, requireOrgRole } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { organizationMembershipRepository } from '@src/repositories/organizationMembership/repository';
import { storeService } from '@src/services/store.service';
import { ERROR_CODES } from '@src/utils/errorCode';
import { ForbiddenError } from '@src/utils/errors';
import { Router } from 'express';

import type {
  GetStoreSuccessResponse,
  StoreParams,
  UpdateStoreRequest,
  UpdateStoreSuccessResponse,
} from '@repo/shared';

const router = Router();

router.get(
  '/',
  requireAuth,
  async (req, res) => {
    const { organizationId, offset, limit } = listMerchantStoresQuerySchema.parse(req.query);

    const membership = await organizationMembershipRepository.findByUserAndOrganization(
      req.user!.id,
      organizationId,
    );

    if (!membership || membership.status !== 'active') {
      throw new ForbiddenError('Access denied', ERROR_CODES.FORBIDDEN);
    }

    const result = await storeService.listStores(organizationId, { offset, limit });

    res.json({ status: 'success', data: result });
  },
);

router.get<StoreParams, GetStoreSuccessResponse, Record<string, never>>(
  '/:storeId',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin', 'staff'),
  validate(storeParamsSchema, 'params'),
  async (req, res) => {
    const store = await storeService.getStore(req.params.storeId);

    res.json({ status: 'success', data: { store } });
  },
);

router.patch<StoreParams, UpdateStoreSuccessResponse, UpdateStoreRequest>(
  '/:storeId',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin'),
  validate(storeParamsSchema, 'params'),
  validate(updateStoreSchema),
  async (req, res) => {
    const store = await storeService.updateStore(
      req.params.storeId,
      req.resolvedOrganizationId!,
      req.body,
    );

    res.json({ status: 'success', data: { store } });
  },
);

export default router;
