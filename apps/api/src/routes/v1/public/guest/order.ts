import { requireGuest } from '@src/middlewares/guestAuth';
import { guestOrderingService } from '@src/services/guestOrdering.service';
import { Router } from 'express';

import { guestClaims } from './session';

import type { GetGuestOrderSuccessResponse } from '@repo/shared';

const router = Router();

router.use(requireGuest);

/**
 * @openapi
 * /v1/public/guest/order:
 *   get:
 *     tags:
 *       - Public / Guest Order
 *     summary: Get the guest's order
 *     security:
 *       - guestToken: []
 *     responses:
 *       200:
 *         description: Current order
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
 *                     order:
 *                       $ref: '#/components/schemas/Order'
 *       404:
 *         description: Cart has not been submitted into an order yet
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               orderNotFound:
 *                 value:
 *                   status: error
 *                   statusCode: 404
 *                   code: ORDER_NOT_FOUND
 *                   message: Order not found
 */
router.get('/', async (req, res) => {
  const order = await guestOrderingService.getGuestOrder(guestClaims(req));

  const response: GetGuestOrderSuccessResponse = {
    status: 'success',
    data: { order },
  };
  res.status(200).json(response);
});

export default router;
