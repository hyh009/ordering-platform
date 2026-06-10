import {
  cartItemInputSchema,
  cartItemParamsSchema,
  submitCartSchema,
  updateCartItemSchema,
} from '@repo/shared';
import { requireGuest } from '@src/middlewares/guestAuth';
import { validate } from '@src/middlewares/validate';
import {
  addCartItem,
  getGuestCart,
  leaveCart,
  removeCartItem,
  submitCart,
  updateCartItem,
} from '@src/services/guestOrdering.service';
import { Router } from 'express';

import { guestClaims } from './session';

import type {
  AddCartItemRequest,
  CartItemParams,
  GetGuestCartSuccessResponse,
  LeaveCartSuccessResponse,
  MutateGuestCartSuccessResponse,
  SubmitCartRequest,
  SubmitCartSuccessResponse,
  UpdateCartItemRequest,
} from '@repo/shared';

const router = Router();

router.use(requireGuest);

/**
 * @openapi
 * /v1/public/guest/cart:
 *   get:
 *     tags:
 *       - Public / Guest Cart
 *     summary: Get the current guest cart
 *     security:
 *       - guestToken: []
 *     responses:
 *       200:
 *         description: Current cart
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
 *       401:
 *         description: Missing or invalid guest token
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
router.get('/', async (req, res) => {
  const cart = await getGuestCart(guestClaims(req));

  const response: GetGuestCartSuccessResponse = {
    status: 'success',
    data: { cart },
  };
  res.status(200).json(response);
});

/**
 * @openapi
 * /v1/public/guest/cart/items:
 *   post:
 *     tags:
 *       - Public / Guest Cart
 *     summary: Add an item to the cart
 *     security:
 *       - guestToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CartItemInput'
 *     responses:
 *       200:
 *         description: Updated cart
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
 *       400:
 *         description: Invalid modifier selection
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               modifierSelectionInvalid:
 *                 value:
 *                   status: error
 *                   statusCode: 400
 *                   code: MODIFIER_SELECTION_INVALID
 *                   message: Modifier selection count is out of bounds
 *       404:
 *         description: Product not found or unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               productNotFound:
 *                 value:
 *                   status: error
 *                   statusCode: 404
 *                   code: PRODUCT_NOT_FOUND
 *                   message: Product not found
 *       409:
 *         description: Cart no longer active, product sold out, or store closed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               cartNotActive:
 *                 value:
 *                   status: error
 *                   statusCode: 409
 *                   code: CART_NOT_ACTIVE
 *                   message: Cart is no longer active
 *               productSoldOut:
 *                 value:
 *                   status: error
 *                   statusCode: 409
 *                   code: PRODUCT_SOLD_OUT
 *                   message: Product is sold out
 *               storeNotOpen:
 *                 value:
 *                   status: error
 *                   statusCode: 409
 *                   code: STORE_NOT_OPEN
 *                   message: Store is not open for ordering
 */
router.post('/items', validate(cartItemInputSchema), async (req, res) => {
  const cart = await addCartItem(
    guestClaims(req),
    req.body as AddCartItemRequest,
  );

  const response: MutateGuestCartSuccessResponse = {
    status: 'success',
    data: { cart },
  };
  res.status(200).json(response);
});

/**
 * @openapi
 * /v1/public/guest/cart/items/{itemId}:
 *   patch:
 *     tags:
 *       - Public / Guest Cart
 *     summary: Update an item you added
 *     security:
 *       - guestToken: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 99
 *               selectedOptions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     modifierId:
 *                       type: string
 *                     optionId:
 *                       type: string
 *               notes:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Updated cart
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
 *       403:
 *         description: Item belongs to another participant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notItemOwner:
 *                 value:
 *                   status: error
 *                   statusCode: 403
 *                   code: NOT_ITEM_OWNER
 *                   message: Only the participant who added an item can modify it
 *       404:
 *         description: Cart item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               cartItemNotFound:
 *                 value:
 *                   status: error
 *                   statusCode: 404
 *                   code: CART_ITEM_NOT_FOUND
 *                   message: Cart item not found
 *       409:
 *         description: Cart no longer active
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               cartNotActive:
 *                 value:
 *                   status: error
 *                   statusCode: 409
 *                   code: CART_NOT_ACTIVE
 *                   message: Cart is no longer active
 *   delete:
 *     tags:
 *       - Public / Guest Cart
 *     summary: Remove an item you added
 *     security:
 *       - guestToken: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated cart
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
 *       403:
 *         description: Item belongs to another participant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notItemOwner:
 *                 value:
 *                   status: error
 *                   statusCode: 403
 *                   code: NOT_ITEM_OWNER
 *                   message: Only the participant who added an item can modify it
 *       404:
 *         description: Cart item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               cartItemNotFound:
 *                 value:
 *                   status: error
 *                   statusCode: 404
 *                   code: CART_ITEM_NOT_FOUND
 *                   message: Cart item not found
 */
router.patch(
  '/items/:itemId',
  validate(cartItemParamsSchema, 'params'),
  validate(updateCartItemSchema),
  async (req, res) => {
    const { itemId } = req.params as CartItemParams;
    const cart = await updateCartItem(
      guestClaims(req),
      itemId,
      req.body as UpdateCartItemRequest,
    );

    const response: MutateGuestCartSuccessResponse = {
      status: 'success',
      data: { cart },
    };
    res.status(200).json(response);
  },
);

router.delete(
  '/items/:itemId',
  validate(cartItemParamsSchema, 'params'),
  async (req, res) => {
    const { itemId } = req.params as CartItemParams;
    const cart = await removeCartItem(guestClaims(req), itemId);

    const response: MutateGuestCartSuccessResponse = {
      status: 'success',
      data: { cart },
    };
    res.status(200).json(response);
  },
);

/**
 * @openapi
 * /v1/public/guest/cart/leave:
 *   post:
 *     tags:
 *       - Public / Guest Cart
 *     summary: Leave the cart
 *     description: >
 *       Removes the participant and their un-submitted items; the guest token
 *       stops working afterwards. The last participant leaving abandons the
 *       cart.
 *     security:
 *       - guestToken: []
 *     responses:
 *       200:
 *         description: Left the cart
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
 *                     leftCartId:
 *                       type: string
 *       409:
 *         description: Cart no longer active
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               cartNotActive:
 *                 value:
 *                   status: error
 *                   statusCode: 409
 *                   code: CART_NOT_ACTIVE
 *                   message: Cart is no longer active
 */
router.post('/leave', async (req, res) => {
  const leftCartId = await leaveCart(guestClaims(req));

  const response: LeaveCartSuccessResponse = {
    status: 'success',
    data: { leftCartId },
  };
  res.status(200).json(response);
});

/**
 * @openapi
 * /v1/public/guest/cart/submit:
 *   post:
 *     tags:
 *       - Public / Guest Cart
 *     summary: Submit the cart and create the order
 *     description: >
 *       Any participant may submit. The cart is checked out atomically and an
 *       order is created with the first batch pending staff confirmation.
 *     security:
 *       - guestToken: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Order created
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
 *       400:
 *         description: Empty cart or items no longer available
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               itemsUnavailable:
 *                 value:
 *                   status: error
 *                   statusCode: 400
 *                   code: PRODUCT_SOLD_OUT
 *                   message: Some items are no longer available
 *                   details:
 *                     unavailableItems:
 *                       - itemId: cart-item-123
 *                         productId: product-123
 *                         reason: product_sold_out
 *       409:
 *         description: Cart already checked out or store closed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               cartNotActive:
 *                 value:
 *                   status: error
 *                   statusCode: 409
 *                   code: CART_NOT_ACTIVE
 *                   message: Cart is no longer active
 */
router.post('/submit', validate(submitCartSchema), async (req, res) => {
  const order = await submitCart(
    guestClaims(req),
    req.body as SubmitCartRequest,
  );

  const response: SubmitCartSuccessResponse = {
    status: 'success',
    data: { order },
  };
  res.status(201).json(response);
});

export default router;
