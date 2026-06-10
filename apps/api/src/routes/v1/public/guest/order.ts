import { addOrderBatchSchema } from '@repo/shared';
import { requireGuest } from '@src/middlewares/guestAuth';
import { validate } from '@src/middlewares/validate';
import {
  addOrderBatch,
  getGuestOrder,
  subscribeToGuestOrder,
} from '@src/services/guestOrdering.service';
import { Router } from 'express';

import { guestClaims } from './session';

import type {
  AddOrderBatchRequest,
  AddOrderBatchSuccessResponse,
  GetGuestOrderSuccessResponse,
  OrderStreamEventDto,
} from '@repo/shared';

const SSE_HEARTBEAT_INTERVAL_MS = 25_000;

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
  const order = await getGuestOrder(guestClaims(req));

  const response: GetGuestOrderSuccessResponse = {
    status: 'success',
    data: { order },
  };
  res.status(200).json(response);
});

/**
 * @openapi
 * /v1/public/guest/order/batches:
 *   post:
 *     tags:
 *       - Public / Guest Order
 *     summary: Add an add-on batch to an open pay-later order
 *     description: >
 *       Allowed while the dine-in pay-later order is unpaid and not completed
 *       or cancelled. The new batch needs staff confirmation again.
 *     security:
 *       - guestToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   $ref: '#/components/schemas/CartItemInput'
 *     responses:
 *       201:
 *         description: Updated order with the appended batch
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
 *       409:
 *         description: Order locked for guest add-ons or store closed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               orderLocked:
 *                 value:
 *                   status: error
 *                   statusCode: 409
 *                   code: ORDER_LOCKED
 *                   message: Order can no longer be extended by guests
 */
router.post('/batches', validate(addOrderBatchSchema), async (req, res) => {
  const { items } = req.body as AddOrderBatchRequest;
  const order = await addOrderBatch(guestClaims(req), items);

  const response: AddOrderBatchSuccessResponse = {
    status: 'success',
    data: { order },
  };
  res.status(201).json(response);
});

/**
 * @openapi
 * /v1/public/guest/order/stream:
 *   get:
 *     tags:
 *       - Public / Guest Order
 *     summary: Live order status stream (Server-Sent Events)
 *     description: >
 *       Emits `order_updated` events with the full order payload. The current
 *       order state is pushed immediately on connect; heartbeat comments keep
 *       the connection alive.
 *     security:
 *       - guestToken: []
 *     responses:
 *       200:
 *         description: text/event-stream of OrderStreamEvent payloads
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               example: |
 *                 event: order_updated
 *                 data: {"type":"order_updated","order":{...}}
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
router.get('/stream', async (req, res) => {
  const claims = guestClaims(req);

  const writeEvent = (event: OrderStreamEventDto) => {
    res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
  };

  const { initial, unsubscribe } = await subscribeToGuestOrder(
    claims,
    writeEvent,
  );

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  writeEvent(initial);

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, SSE_HEARTBEAT_INTERVAL_MS);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

export default router;
