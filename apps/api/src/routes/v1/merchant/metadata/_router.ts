import { Router } from 'express';

import allergensRouter from './allergens';
import dietaryMarkersRouter from './dietaryMarkers';

const router = Router();

router.use('/allergens', allergensRouter);
router.use('/dietary-markers', dietaryMarkersRouter);

export default router;
