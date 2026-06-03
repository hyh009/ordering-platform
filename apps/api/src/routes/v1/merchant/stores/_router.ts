import { Router } from 'express';

import storeRouter from './[storeId]';
import categoriesRouter from './[storeId]/categories';
import productModifiersRouter from './[storeId]/productModifier';
import tagsRouter from './[storeId]/tags';
import collectionRouter from './index';

const router = Router();

router.use('/', collectionRouter);
router.use('/:storeId/categories', categoriesRouter);
router.use('/:storeId/product-modifiers', productModifiersRouter);
router.use('/:storeId/tags', tagsRouter);
router.use('/:storeId', storeRouter);

export default router;
