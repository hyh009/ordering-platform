import { Router } from 'express';

import allergensRouter from './allergens';
import authRouter from './auth';
import dietaryMarkersRouter from './dietaryMarkers';
import healthRouter from './health';
import organizationsRouter from './organizations';
import todosRouter from './todos';

const router = Router();

router.use('/auth', authRouter);
router.use('/allergens', allergensRouter);
router.use('/dietary-markers', dietaryMarkersRouter);
router.use('/health', healthRouter);
router.use('/organizations', organizationsRouter);
router.use('/todos', todosRouter);

export default router;
