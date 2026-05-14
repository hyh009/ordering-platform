import { passport } from '@src/config/passport';
import { ERROR_CODES } from '@src/utils/errorCode';
import { UnauthorizedError } from '@src/utils/errors';

import type { NextFunction, Request, Response } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  passport.authenticate(
    'jwt',
    { session: false },
    (error: unknown, user: Express.User | false | null) => {
      if (error) {
        next(error);
        return;
      }

      if (!user) {
        next(
          new UnauthorizedError(
            'Authentication required',
            ERROR_CODES.UNAUTHORIZED,
          ),
        );
        return;
      }

      req.user = user;
      next();
    },
  )(req, res, next);
}
