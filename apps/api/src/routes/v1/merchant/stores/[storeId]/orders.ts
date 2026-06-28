import {
  listOrdersQuerySchema,
  orderParamsSchema,
  orderStoreParamsSchema,
} from '@repo/shared';
import { requireAuth, requireOrgRole } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { orderService } from '@src/services/order.service';
import { Router } from 'express';

import type {
  GetMerchantOrderSuccessResponse,
  ListOrdersSuccessResponse,
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

export default router;
