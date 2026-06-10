import { requireGuest } from '@src/middlewares/guestAuth';
import { getGuestSession } from '@src/services/guestOrdering.service';
import { ERROR_CODES } from '@src/utils/errorCode';
import { UnauthorizedError } from '@src/utils/errors';
import { Router } from 'express';

import type { GetGuestSessionSuccessResponse } from '@repo/shared';
import type { GuestTokenClaims } from '@src/services/guestToken.service';
import type { Request } from 'express';

const router = Router();

export function guestClaims(req: Request): GuestTokenClaims {
  if (!req.guest) {
    throw new UnauthorizedError(
      'Guest token required',
      ERROR_CODES.INVALID_GUEST_TOKEN,
    );
  }
  return req.guest;
}

/**
 * @openapi
 * /v1/public/guest/session:
 *   get:
 *     tags:
 *       - Public / Guest Session
 *     summary: Restore the guest ordering session from a guest token
 *     description: >
 *       Returns the cart while it is active (or abandoned), and the order once
 *       the cart has been checked out. The frontend uses this to resume after
 *       a reload.
 *     security:
 *       - guestToken: []
 *     responses:
 *       200:
 *         description: Current guest session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     session:
 *                       $ref: '#/components/schemas/GuestSession'
 *       401:
 *         description: Missing, invalid, or no-longer-member guest token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidGuestToken:
 *                 value:
 *                   status: error
 *                   statusCode: 401
 *                   code: INVALID_GUEST_TOKEN
 *                   message: Invalid guest token
 */
router.get('/', requireGuest, async (req, res) => {
  const session = await getGuestSession(guestClaims(req));

  const response: GetGuestSessionSuccessResponse = {
    status: 'success',
    data: { session },
  };
  res.status(200).json(response);
});

export default router;
