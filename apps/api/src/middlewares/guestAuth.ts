import { verifyGuestToken } from '@src/services/guestToken.service';
import { ERROR_CODES } from '@src/utils/errorCode';
import { UnauthorizedError } from '@src/utils/errors';

import type { NextFunction, Request, Response } from 'express';

export function requireGuest(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    throw new UnauthorizedError(
      'Guest token required',
      ERROR_CODES.INVALID_GUEST_TOKEN,
    );
  }

  req.guest = verifyGuestToken(token);
  next();
}
