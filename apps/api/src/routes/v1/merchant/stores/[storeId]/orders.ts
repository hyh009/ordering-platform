import {
  advanceBatchStatusSchema,
  cancelBatchSchema,
  cancelOrderSchema,
  checkoutOrderSchema,
  completeOrderSchema,
  listOrdersQuerySchema,
  orderBatchParamsSchema,
  orderParamsSchema,
  orderStoreParamsSchema,
} from '@repo/shared';
import { requireAuth, requireOrgRole } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { orderService } from '@src/services/order.service';
import { Router } from 'express';

import type {
  AdvanceBatchStatusRequest,
  CancelBatchRequest,
  CancelOrderRequest,
  CheckoutOrderRequest,
  CompleteOrderRequest,
  GetMerchantOrderSuccessResponse,
  ListOrdersSuccessResponse,
  OrderBatchParams,
  OrderParams,
  OrderStoreParams,
} from '@repo/shared';

const router = Router({ mergeParams: true });

/**
 * @openapi
 * components:
 *   schemas:
 *     OrderSummary:
 *       type: object
 *       required:
 *         - id
 *         - displayNumber
 *         - status
 *         - paymentStatus
 *         - orderType
 *         - checkoutMode
 *         - businessDate
 *         - participantCount
 *         - itemCount
 *         - totalAmount
 *         - createdAt
 *       properties:
 *         id:
 *           type: string
 *           example: order-123
 *         displayNumber:
 *           type: string
 *           example: '0001'
 *         status:
 *           type: string
 *           enum:
 *             - pending_payment
 *             - pending_confirmation
 *             - preparing
 *             - ready
 *             - served
 *             - completed
 *             - cancelled
 *           example: preparing
 *         paymentStatus:
 *           type: string
 *           enum:
 *             - unpaid
 *             - paid
 *             - refunded
 *             - voided
 *           example: unpaid
 *         orderType:
 *           type: string
 *           enum:
 *             - dine_in
 *             - takeaway
 *           example: dine_in
 *         checkoutMode:
 *           type: string
 *           enum:
 *             - pay_now
 *             - pay_later
 *           example: pay_later
 *         businessDate:
 *           type: string
 *           format: date
 *           example: '2026-06-28'
 *         tableNumber:
 *           type: string
 *           example: 'A3'
 *         participantCount:
 *           type: integer
 *           example: 2
 *         itemCount:
 *           type: integer
 *           example: 5
 *         totalAmount:
 *           type: number
 *           example: 480
 *         createdAt:
 *           type: string
 *           format: date-time
 *     OrderListSuccessResponse:
 *       type: object
 *       required:
 *         - status
 *         - data
 *       properties:
 *         status:
 *           type: string
 *           enum:
 *             - success
 *         data:
 *           type: object
 *           required:
 *             - orders
 *             - total
 *             - page
 *             - pageSize
 *           properties:
 *             orders:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/OrderSummary'
 *             total:
 *               type: integer
 *               example: 42
 *             page:
 *               type: integer
 *               example: 1
 *             pageSize:
 *               type: integer
 *               example: 20
 *     MerchantOrderResourceSuccessResponse:
 *       type: object
 *       required:
 *         - status
 *         - data
 *       properties:
 *         status:
 *           type: string
 *           enum:
 *             - success
 *         data:
 *           type: object
 *           required:
 *             - order
 *           properties:
 *             order:
 *               $ref: '#/components/schemas/Order'
 */

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/orders:
 *   get:
 *     tags:
 *       - Merchant / Orders
 *     summary: List store orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         example: store-123
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - pending_payment
 *             - pending_confirmation
 *             - preparing
 *             - ready
 *             - served
 *             - completed
 *             - cancelled
 *       - in: query
 *         name: paymentStatus
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - unpaid
 *             - paid
 *             - refunded
 *             - voided
 *       - in: query
 *         name: businessDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: '2026-06-28'
 *       - in: query
 *         name: q
 *         required: false
 *         schema:
 *           type: string
 *         description: Search by display number or table number
 *     responses:
 *       200:
 *         description: Orders returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderListSuccessResponse'
 *       403:
 *         description: Insufficient role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               forbidden:
 *                 value:
 *                   status: error
 *                   statusCode: 403
 *                   code: FORBIDDEN
 *                   message: Forbidden
 */
router.get<OrderStoreParams, ListOrdersSuccessResponse>(
  '/',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin', 'staff'),
  validate(orderStoreParamsSchema, 'params'),
  async (req, res) => {
    const query = listOrdersQuerySchema.parse(req.query);
    const result = await orderService.listOrders(req.params.storeId, query);

    res.json({ status: 'success', data: result });
  },
);

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/orders/{orderId}:
 *   get:
 *     tags:
 *       - Merchant / Orders
 *     summary: Get a single store order
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         example: store-123
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         example: order-123
 *     responses:
 *       200:
 *         description: Order returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MerchantOrderResourceSuccessResponse'
 *       403:
 *         description: Insufficient role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               forbidden:
 *                 value:
 *                   status: error
 *                   statusCode: 403
 *                   code: FORBIDDEN
 *                   message: Forbidden
 *       404:
 *         description: Order not found
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
router.get<OrderParams, GetMerchantOrderSuccessResponse>(
  '/:orderId',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin', 'staff'),
  validate(orderParamsSchema, 'params'),
  async (req, res) => {
    const result = await orderService.getOrder(
      req.params.storeId,
      req.params.orderId,
    );

    res.json({ status: 'success', data: result });
  },
);

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/orders/{orderId}/cancel:
 *   patch:
 *     tags:
 *       - Merchant / Orders
 *     summary: Cancel an order
 *     description: >-
 *       Cancels the order. Allowed on any non-terminal status (not `completed`
 *       or `cancelled`). A cancel reason is required. If the order was paid, its
 *       `paymentStatus` is set to `voided` (no refund processed). Succeeds with
 *       the updated order.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         example: store-123
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         example: order-123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reasons:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum:
 *                     - no_show
 *                     - out_of_stock
 *                     - customer_request
 *                     - other
 *               note:
 *                 type: string
 *                 maxLength: 500
 *               expectedUpdatedAt:
 *                 type: string
 *                 format: date-time
 *                 description: Optimistic concurrency token — pass `order.updatedAt` from last load.
 *     responses:
 *       200:
 *         description: Order cancelled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MerchantOrderResourceSuccessResponse'
 *       403:
 *         description: Insufficient role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               forbidden:
 *                 value:
 *                   status: error
 *                   statusCode: 403
 *                   code: FORBIDDEN
 *                   message: Forbidden
 *       404:
 *         description: Order not found
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
 *       409:
 *         description: Order is in a terminal state or stale expectedUpdatedAt
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
 *                   message: Order can no longer be cancelled
 */
router.patch<OrderParams, GetMerchantOrderSuccessResponse, CancelOrderRequest>(
  '/:orderId/cancel',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin'),
  validate(orderParamsSchema, 'params'),
  validate(cancelOrderSchema),
  async (req, res) => {
    const expectedUpdatedAt = req.body.expectedUpdatedAt
      ? new Date(req.body.expectedUpdatedAt)
      : undefined;

    const result = await orderService.cancelOrder(
      req.params.storeId,
      req.params.orderId,
      {
        reasons: req.body.reasons,
        note: req.body.note,
        cancelledBy: req.user!.id,
        expectedUpdatedAt,
      },
    );

    res.json({ status: 'success', data: result });
  },
);

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/orders/{orderId}/complete:
 *   patch:
 *     tags:
 *       - Merchant / Orders
 *     summary: Complete an order
 *     description: >-
 *       Marks the order as `completed`. Allowed only when every batch is in
 *       {`served`, `cancelled`} and at least one is not cancelled.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expectedUpdatedAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Order completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MerchantOrderResourceSuccessResponse'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Not all rounds are served/cancelled, or stale expectedUpdatedAt
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
 *                   message: Order cannot be completed in its current state
 */
router.patch<OrderParams, GetMerchantOrderSuccessResponse, CompleteOrderRequest>(
  '/:orderId/complete',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin'),
  validate(orderParamsSchema, 'params'),
  validate(completeOrderSchema),
  async (req, res) => {
    const expectedUpdatedAt = req.body.expectedUpdatedAt
      ? new Date(req.body.expectedUpdatedAt)
      : undefined;

    const result = await orderService.completeOrder(
      req.params.storeId,
      req.params.orderId,
      expectedUpdatedAt,
    );

    res.json({ status: 'success', data: result });
  },
);

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/orders/{orderId}/batches/{batchId}/status:
 *   patch:
 *     tags:
 *       - Merchant / Orders
 *     summary: Advance a batch status
 *     description: >-
 *       Advances a batch forward-only through
 *       `pending_confirmation → preparing → ready → served`.
 *       Sets the batch timestamp and recomputes the order rollup status.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: batchId
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum:
 *                   - preparing
 *                   - ready
 *                   - served
 *               expectedUpdatedAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Batch status advanced
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MerchantOrderResourceSuccessResponse'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Batch cannot be advanced (terminal state or backward) or stale expectedUpdatedAt
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
 *                   message: Batch cannot be advanced to the requested status
 */
router.patch<
  OrderBatchParams,
  GetMerchantOrderSuccessResponse,
  AdvanceBatchStatusRequest
>(
  '/:orderId/batches/:batchId/status',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin'),
  validate(orderBatchParamsSchema, 'params'),
  validate(advanceBatchStatusSchema),
  async (req, res) => {
    const expectedUpdatedAt = req.body.expectedUpdatedAt
      ? new Date(req.body.expectedUpdatedAt)
      : undefined;

    const result = await orderService.advanceBatchStatus(
      req.params.storeId,
      req.params.orderId,
      req.params.batchId,
      req.body.status,
      expectedUpdatedAt,
    );

    res.json({ status: 'success', data: result });
  },
);

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/orders/{orderId}/batches/{batchId}/cancel:
 *   patch:
 *     tags:
 *       - Merchant / Orders
 *     summary: Cancel a batch
 *     description: >-
 *       Cancels a single batch. A cancel reason or note is required. Recomputes
 *       the order rollup status; if all batches are cancelled the order becomes
 *       `cancelled`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: batchId
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
 *               reasons:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum:
 *                     - no_show
 *                     - out_of_stock
 *                     - customer_request
 *                     - other
 *               note:
 *                 type: string
 *                 maxLength: 500
 *               expectedUpdatedAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Batch cancelled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MerchantOrderResourceSuccessResponse'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Batch already terminal or stale expectedUpdatedAt
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
 *                   message: Batch is in a terminal state and cannot be cancelled
 */
router.patch<
  OrderBatchParams,
  GetMerchantOrderSuccessResponse,
  CancelBatchRequest
>(
  '/:orderId/batches/:batchId/cancel',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin'),
  validate(orderBatchParamsSchema, 'params'),
  validate(cancelBatchSchema),
  async (req, res) => {
    const expectedUpdatedAt = req.body.expectedUpdatedAt
      ? new Date(req.body.expectedUpdatedAt)
      : undefined;

    const result = await orderService.cancelBatch(
      req.params.storeId,
      req.params.orderId,
      req.params.batchId,
      {
        reasons: req.body.reasons,
        note: req.body.note,
        cancelledBy: req.user!.id,
        expectedUpdatedAt,
      },
    );

    res.json({ status: 'success', data: result });
  },
);

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/orders/{orderId}/checkout:
 *   patch:
 *     tags:
 *       - Merchant / Orders
 *     summary: Mark an order as paid (checkout)
 *     description: >-
 *       Advances `paymentStatus` from `unpaid` to `paid` and records `paidAt`.
 *       If `status` is `pending_payment`, it also advances to
 *       `pending_confirmation`. Blocked if already `paid`, `refunded`, `voided`,
 *       or `cancelled`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         example: store-123
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         example: order-123
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expectedUpdatedAt:
 *                 type: string
 *                 format: date-time
 *                 description: Optimistic concurrency token — pass `order.updatedAt` from last load.
 *     responses:
 *       200:
 *         description: Order checked out (marked paid)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MerchantOrderResourceSuccessResponse'
 *       403:
 *         description: Insufficient role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               forbidden:
 *                 value:
 *                   status: error
 *                   statusCode: 403
 *                   code: FORBIDDEN
 *                   message: Forbidden
 *       404:
 *         description: Order not found
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
 *       409:
 *         description: Order already paid, voided, refunded, cancelled, or stale expectedUpdatedAt
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
 *                   message: Order cannot be checked out in its current state
 */
router.patch<
  OrderParams,
  GetMerchantOrderSuccessResponse,
  CheckoutOrderRequest
>(
  '/:orderId/checkout',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin'),
  validate(orderParamsSchema, 'params'),
  validate(checkoutOrderSchema),
  async (req, res) => {
    const expectedUpdatedAt = req.body.expectedUpdatedAt
      ? new Date(req.body.expectedUpdatedAt)
      : undefined;

    const result = await orderService.checkoutOrder(
      req.params.storeId,
      req.params.orderId,
      {
        actingUserId: req.user!.id,
        expectedUpdatedAt,
      },
    );

    res.json({ status: 'success', data: result });
  },
);

export default router;
