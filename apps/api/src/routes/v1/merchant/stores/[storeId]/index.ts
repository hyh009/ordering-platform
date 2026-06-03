import { storeParamsSchema, updateStoreSchema } from '@repo/shared';
import { requireAuth, requireOrgRole } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { storeService } from '@src/services/store.service';
import { Router } from 'express';

import type {
  GetStoreSuccessResponse,
  StoreParams,
  UpdateStoreRequest,
  UpdateStoreSuccessResponse,
} from '@repo/shared';

const router = Router({ mergeParams: true });

router.get<StoreParams, GetStoreSuccessResponse, Record<string, never>>(
  '/',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin', 'staff'),
  validate(storeParamsSchema, 'params'),
  async (req, res) => {
    const store = await storeService.getStore(req.params.storeId);

    res.json({ status: 'success', data: { store } });
  },
);

router.patch<StoreParams, UpdateStoreSuccessResponse, UpdateStoreRequest>(
  '/',
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
