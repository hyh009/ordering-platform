import { Router } from 'express';

import allergensRouter from './allergens';
import authRouter from './auth';
import dietaryMarkersRouter from './dietaryMarkers';
import healthRouter from './health';
import merchantStoresRouter from './merchant/stores';
import organizationsRouter from './organizations';
import usersRouter from './users';

const router = Router();

router.use('/auth', authRouter);
router.use('/allergens', allergensRouter);
router.use('/dietary-markers', dietaryMarkersRouter);
router.use('/health', healthRouter);
router.use('/merchant/stores', merchantStoresRouter);
router.use('/organizations', organizationsRouter);
router.use('/users', usersRouter);

export default router;
