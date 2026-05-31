import { passport } from '@src/config/passport';
import { organizationMembershipRepository } from '@src/repositories/organizationMembership/repository';
import { storeRepository } from '@src/repositories/store/repository';
import { ERROR_CODES } from '@src/utils/errorCode';
import { ForbiddenError, UnauthorizedError } from '@src/utils/errors';

import type { OrganizationMembershipRole } from '@repo/shared';
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

export function requireOrgRole(...roles: OrganizationMembershipRole[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(
        new UnauthorizedError(
          'Authentication required',
          ERROR_CODES.UNAUTHORIZED,
        ),
      );
      return;
    }

    try {
      const rawOrgId = req.params.organizationId;
      let organizationId: string | undefined = Array.isArray(rawOrgId)
        ? rawOrgId[0]
        : rawOrgId;

      if (!organizationId) {
        const rawStoreId = req.params.storeId;
        const storeId = Array.isArray(rawStoreId) ? rawStoreId[0] : rawStoreId;
        if (storeId) {
          const store = await storeRepository.findById(storeId);
          if (!store) {
            next(
              new ForbiddenError(
                'Insufficient permissions',
                ERROR_CODES.FORBIDDEN,
              ),
            );
            return;
          }
          organizationId = store.organizationId;
          req.resolvedOrganizationId = store.organizationId;
        }
      }

      if (!organizationId) {
        next(
          new ForbiddenError('Insufficient permissions', ERROR_CODES.FORBIDDEN),
        );
        return;
      }

      req.resolvedOrganizationId = organizationId;

      const membership =
        await organizationMembershipRepository.findByUserAndOrganization(
          req.user.id,
          organizationId,
        );

      if (
        !membership ||
        membership.status !== 'active' ||
        !roles.includes(membership.role)
      ) {
        next(
          new ForbiddenError('Insufficient permissions', ERROR_CODES.FORBIDDEN),
        );
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireSuperAdmin() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(
        new UnauthorizedError(
          'Authentication required',
          ERROR_CODES.UNAUTHORIZED,
        ),
      );
      return;
    }

    if (!req.user.isSuperAdmin) {
      next(
        new ForbiddenError(
          'Insufficient platform permissions',
          ERROR_CODES.FORBIDDEN,
        ),
      );
      return;
    }

    next();
  };
}
