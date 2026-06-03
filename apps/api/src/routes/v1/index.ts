import { Router } from 'express';

import allergensRouter from './admin/allergens';
import dietaryMarkersRouter from './admin/dietaryMarkers';
import organizationsRouter from './admin/organizations/_router';
import usersRouter from './admin/users';
import authRouter from './auth';
import healthRouter from './health';
import merchantStoresRouter from './merchant/stores';
import merchantTagsRouter from './merchant/tags';

const router = Router();

router.use('/auth', authRouter);
router.use('/admin/allergens', allergensRouter);
router.use('/admin/dietary-markers', dietaryMarkersRouter);
router.use('/admin/organizations', organizationsRouter);
router.use('/admin/users', usersRouter);
router.use('/health', healthRouter);
router.use('/merchant/stores', merchantStoresRouter);
router.use('/merchant/stores/:storeId/tags', merchantTagsRouter);

export default router;
