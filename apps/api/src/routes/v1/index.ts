import { Router } from 'express';

import allergensRouter from './allergens';
import authRouter from './auth';
import dietaryMarkersRouter from './dietaryMarkers';
import healthRouter from './health';
import organizationsRouter from './organizations';

const router = Router();

router.use('/auth', authRouter);
router.use('/allergens', allergensRouter);
router.use('/dietary-markers', dietaryMarkersRouter);
router.use('/health', healthRouter);
router.use('/organizations', organizationsRouter);

export default router;
