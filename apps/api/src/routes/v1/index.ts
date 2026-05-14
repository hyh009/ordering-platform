import { Router } from 'express';

import authRouter from './auth';
import healthRouter from './health';
import todosRouter from './todos';

const router = Router();

router.use('/auth', authRouter);
router.use('/health', healthRouter);
router.use('/todos', todosRouter);

export default router;
