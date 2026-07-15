import { env } from '@src/config/env';
import { ERROR_CODES } from '@src/utils/errorCode';
import { UnauthorizedError } from '@src/utils/errors';
import { sign, verify } from 'jsonwebtoken';

const GUEST_TOKEN_AUDIENCE = 'guest';

// MVP has no refresh flow for guests; a generous fixed TTL covers one visit.
const GUEST_TOKEN_TTL_SECONDS = 12 * 60 * 60;

export type GuestTokenClaims = {
  storeId: string;
  cartId: string;
  participantId: string;
};

export class GuestTokenService {
  public signGuestToken(claims: GuestTokenClaims): string {
    return sign(
      {
        storeId: claims.storeId,
        cartId: claims.cartId,
        participantId: claims.participantId,
      },
      env.AUTH_ACCESS_TOKEN_SECRET,
      {
        audience: GUEST_TOKEN_AUDIENCE,
        expiresIn: GUEST_TOKEN_TTL_SECONDS,
      },
    );
  }

  public verifyGuestToken(token: string): GuestTokenClaims {
    let payload: unknown;
    try {
      payload = verify(token, env.AUTH_ACCESS_TOKEN_SECRET, {
        audience: GUEST_TOKEN_AUDIENCE,
      });
    } catch {
      throw new UnauthorizedError(
        'Invalid guest token',
        ERROR_CODES.INVALID_GUEST_TOKEN,
      );
    }

    const claims = payload as Record<string, unknown> | null;
    const storeId = claims?.storeId;
    const cartId = claims?.cartId;
    const participantId = claims?.participantId;

    if (
      typeof storeId !== 'string' ||
      typeof cartId !== 'string' ||
      typeof participantId !== 'string'
    ) {
      throw new UnauthorizedError(
        'Invalid guest token',
        ERROR_CODES.INVALID_GUEST_TOKEN,
      );
    }

    return { storeId, cartId, participantId };
  }
}

export function createGuestTokenService() {
  return new GuestTokenService();
}

export const guestTokenService = createGuestTokenService();
