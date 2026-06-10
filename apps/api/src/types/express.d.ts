import type { AuthUserDto } from '@repo/shared';
import type { GuestTokenClaims } from '@src/services/guestToken.service';

declare global {
  namespace Express {
    interface User {
      id: AuthUserDto['id'];
      email: AuthUserDto['email'];
      username: AuthUserDto['username'];
      isSuperAdmin: AuthUserDto['isSuperAdmin'];
    }

    interface Request {
      requestId: string;
      /** Set by requireOrgRole when organizationId is resolved via a storeId lookup */
      resolvedOrganizationId?: string;
      /** Set by requireGuest from a verified guest ordering token */
      guest?: GuestTokenClaims;
    }
  }
}

export {};
