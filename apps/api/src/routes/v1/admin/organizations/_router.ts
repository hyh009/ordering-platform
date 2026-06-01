import { Router } from 'express';

import organizationRouter from './[organizationId]';
import membershipsRouter from './[organizationId]/memberships';
import membershipRouter from './[organizationId]/memberships/[membershipId]';
import storesRouter from './[organizationId]/stores';
import storeRouter from './[organizationId]/stores/[storeId]';
import './_openapi';
import collectionRouter from './index';

const router = Router();

router.use('/', collectionRouter);
router.use('/:organizationId/memberships/:membershipId', membershipRouter);
router.use('/:organizationId/memberships', membershipsRouter);
router.use('/:organizationId/stores/:storeId', storeRouter);
router.use('/:organizationId/stores', storesRouter);
router.use('/:organizationId', organizationRouter);

export default router;
