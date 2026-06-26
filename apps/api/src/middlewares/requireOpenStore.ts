import { requireStoreOpen } from '@src/services/guestOrdering';
import { getActivePublicStore } from '@src/services/publicStore.service';
import { ERROR_CODES } from '@src/utils/errorCode';
import { UnauthorizedError } from '@src/utils/errors';

import type { NextFunction, Request, Response } from 'express';

/**
 * Gate guest write actions that put new content into an order (add a cart item,
 * submit a round) on the store being open. Mount after `requireGuest` so the
 * guest claims are available. The store is loaded and the open check runs once,
 * at request receipt — handlers downstream no longer repeat it.
 */
export async function requireOpenStore(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const claims = req.guest;
    if (!claims) {
      throw new UnauthorizedError(
        'Guest token required',
        ERROR_CODES.INVALID_GUEST_TOKEN,
      );
    }

    const store = await getActivePublicStore(claims.storeId);
    requireStoreOpen(store, new Date());
    next();
  } catch (error) {
    next(error);
  }
}
