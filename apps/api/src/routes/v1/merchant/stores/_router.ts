import { Router } from 'express';

import storeRouter from './[storeId]';
import tagsRouter from './[storeId]/tags';
import collectionRouter from './index';

const router = Router();

router.use('/', collectionRouter);
router.use('/:storeId/tags', tagsRouter);
router.use('/:storeId', storeRouter);

export default router;
