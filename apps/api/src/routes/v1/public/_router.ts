import { Router } from 'express';

import guestCartRouter from './guest/cart';
import guestOrderRouter from './guest/order';
import guestSessionRouter from './guest/session';
import storeCartsRouter from './stores/[storeId]/carts';
import storeRouter from './stores/[storeId]/index';

const router = Router();

router.use('/stores/:storeId/carts', storeCartsRouter);
router.use('/stores/:storeId', storeRouter);
router.use('/guest/session', guestSessionRouter);
router.use('/guest/cart', guestCartRouter);
router.use('/guest/order', guestOrderRouter);

export default router;
