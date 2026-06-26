import {
  createCartSchema,
  joinCartSchema,
  storeParamsSchema,
} from '@repo/shared';
import { validate } from '@src/middlewares/validate';
import { createCart, joinCart } from '@src/services/guestOrdering';
import { Router } from 'express';

import type {
  CreateCartRequest,
  CreateCartSuccessResponse,
  JoinCartRequest,
  JoinCartSuccessResponse,
  StoreParams,
} from '@repo/shared';

const router = Router({ mergeParams: true });

/**
 * @openapi
 * /v1/public/stores/{storeId}/carts:
 *   post:
 *     tags:
 *       - Public / Carts
 *     summary: Start a new guest cart
 *     description: >
 *       Creates an active cart for the chosen order type and issues the guest
 *       token of the first participant. Every dine-in cart receives a join
 *       code for group ordering before checkout.
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderType
 *               - avatarKey
 *             properties:
 *               orderType:
 *                 type: string
 *                 enum:
 *                   - dine_in
 *                   - takeaway
 *               tableNumber:
 *                 type: string
 *                 example: T1
 *               avatarKey:
 *                 type: string
 *                 enum: [bear, cat, dog, eagle, elephant, flamingo, gorilla, lion, monkey, octopus, owl, ox, sheep, unicorn, wolf, zebra]
 *               displayName:
 *                 type: string
 *                 example: Amy
 *     responses:
 *       201:
 *         description: Cart created
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
 *                     cart:
 *                       $ref: '#/components/schemas/Cart'
 *                     participantId:
 *                       type: string
 *                     guestToken:
 *                       type: string
 *       400:
 *         description: Order type not enabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               orderTypeNotEnabled:
 *                 value:
 *                   status: error
 *                   statusCode: 400
 *                   code: ORDER_TYPE_NOT_ENABLED
 *                   message: Order type is not enabled for this store
 *       404:
 *         description: Store not found or disabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               storeNotFound:
 *                 value:
 *                   status: error
 *                   statusCode: 404
 *                   code: STORE_NOT_FOUND
 *                   message: Store not found
 *       409:
 *         description: Store closed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               storeNotOpen:
 *                 value:
 *                   status: error
 *                   statusCode: 409
 *                   code: STORE_NOT_OPEN
 *                   message: Store is not open for ordering
 */
router.post(
  '/',
  validate(storeParamsSchema, 'params'),
  validate(createCartSchema),
  async (req, res) => {
    const { storeId } = req.params as StoreParams;
    const result = await createCart(storeId, req.body as CreateCartRequest);

    const response: CreateCartSuccessResponse = {
      status: 'success',
      data: result,
    };
    res.status(201).json(response);
  },
);

/**
 * @openapi
 * /v1/public/stores/{storeId}/carts/join:
 *   post:
 *     tags:
 *       - Public / Carts
 *     summary: Join a group cart by join code
 *     description: >
 *       Adds a new participant and issues that participant's guest token.
 *       While the cart is active the session returns the cart; after checkout
 *       the join code routes to the open pay-later order until payment.
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - joinCode
 *               - avatarKey
 *             properties:
 *               joinCode:
 *                 type: string
 *                 example: WXK7M2PQ9R
 *               avatarKey:
 *                 type: string
 *                 enum: [bear, cat, dog, eagle, elephant, flamingo, gorilla, lion, monkey, octopus, owl, ox, sheep, unicorn, wolf, zebra]
 *               displayName:
 *                 type: string
 *                 example: Ben
 *     responses:
 *       200:
 *         description: Joined the cart or open order
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
 *                     guestToken:
 *                       type: string
 *       400:
 *         description: Invalid or expired join code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidJoinCode:
 *                 value:
 *                   status: error
 *                   statusCode: 400
 *                   code: INVALID_JOIN_CODE
 *                   message: Invalid or expired join code
 */
router.post(
  '/join',
  validate(storeParamsSchema, 'params'),
  validate(joinCartSchema),
  async (req, res) => {
    const { storeId } = req.params as StoreParams;
    const result = await joinCart(storeId, req.body as JoinCartRequest);

    const response: JoinCartSuccessResponse = {
      status: 'success',
      data: result,
    };
    res.status(200).json(response);
  },
);

export default router;
