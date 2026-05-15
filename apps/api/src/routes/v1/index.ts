import { Router } from 'express';

import authRouter from './auth';
import healthRouter from './health';
import organizationsRouter from './organizations';
import todosRouter from './todos';

const router = Router();

router.use('/auth', authRouter);
router.use('/health', healthRouter);
router.use('/organizations', organizationsRouter);
router.use('/todos', todosRouter);

export default router;
