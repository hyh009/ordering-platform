import { requireGuest } from '@src/middlewares/guestAuth';
import { openSseStream } from '@src/realtime/sse';
import { guestOrderingService } from '@src/services/guestOrdering.service';
import { Router } from 'express';

import { guestClaims } from './session';

const router = Router();

router.use(requireGuest);

/**
 * @openapi
 * /v1/public/guest/stream:
 *   get:
 *     tags:
 *       - Public / Guest Session
 *     summary: Live guest session stream (Server-Sent Events)
 *     description: >
 *       One connection spans the guest session lifecycle. Emits `cart_updated`
 *       while a draft cart is live and `order_updated` once a round has been
 *       submitted; the current snapshot (cart and/or order) is pushed
 *       immediately on connect, and heartbeat comments keep the connection
 *       alive. Clients replace their local copy on each event.
 *     security:
 *       - guestToken: []
 *     responses:
 *       200:
 *         description: text/event-stream of GuestStreamEvent payloads
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               example: |
 *                 event: cart_updated
 *                 data: {"type":"cart_updated","cart":{...}}
 *       401:
 *         description: Missing, invalid, or no-longer-member guest token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', async (req, res) => {
  const claims = guestClaims(req);

  // Resolve the session BEFORE opening the stream so token/not-found failures
  // surface as a normal JSON error response instead of after the event-stream
  // headers have been flushed.
  const { initial, subscribe } =
    await guestOrderingService.openGuestSessionStream(claims);

  const stream = openSseStream(res, { req });

  for (const event of initial) {
    stream.send({ event: event.type, data: event });
  }

  const unsubscribe = subscribe((event) => {
    stream.send({ event: event.type, data: event });
  });

  req.on('close', unsubscribe);
});

export default router;
