import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';
import {
  canAdvanceBatch,
  canCompleteOrder,
  computeActiveOrderTotals,
  rollupOrderStatus,
} from '../src/models/order/model.js';

type TestRole = 'org_owner' | 'org_admin' | 'staff';

type TestCartItem = {
  id: string;
  productId: string;
  productName: { en?: string; 'zh-TW'?: string };
  quantity: number;
  unitPrice: number;
  totalItemPrice: number;
  selectedOptions: unknown[];
  addedByParticipantId?: string;
  createdAt: Date;
};

type TestOrder = {
  id: string;
  organizationId: string;
  storeId: string;
  cartId?: string;
  orderType: 'dine_in' | 'takeaway';
  checkoutMode: 'pay_now' | 'pay_later';
  businessDate: string;
  dailySequence: number;
  displayNumber: string;
  status: string;
  paymentStatus: string;
  tableNumber?: string;
  participants: {
    id: string;
    avatarKey: string;
    displayName?: string;
    joinedAt: Date;
  }[];
  items: TestCartItem[];
  batches: {
    id: string;
    batchNumber: number;
    status: string;
    submittedAt: Date;
    submittedByParticipantId?: string;
    confirmedAt?: Date;
    readyAt?: Date;
    cancelledAt?: Date;
    cancelReasons?: string[];
    cancelNote?: string;
    cancelledBy?: string;
    items: TestCartItem[];
    subtotal: number;
  }[];
  notes?: string;
  subtotal: number;
  serviceFeeRate: number;
  serviceFeeAmount: number;
  totalAmount: number;
  orderingClosesAt: Date;
  paidAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReasons?: string[];
  cancelNote?: string;
  cancelledBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

const mocks = vi.hoisted(() => {
  const users = new Map<
    string,
    {
      id: string;
      email: string;
      username: string;
      isSuperAdmin: boolean;
      status: 'active' | 'disabled';
      tokenVersion: number;
    }
  >();
  const stores = new Map<string, { id: string; organizationId: string }>();
  const memberships = new Map<string, { role: TestRole; status: 'active' }>();
  let orders: TestOrder[] = [];
  let orderCounter = 1;
  const sseEmissions: { cartId: string; order: unknown }[] = [];

  function cloneOrder(order: TestOrder): TestOrder {
    return structuredClone(order) as TestOrder;
  }

  return {
    userRepository: {
      async findById(userId: string) {
        const user = users.get(userId);
        return user ? { ...user } : null;
      },
    },
    storeRepository: {
      async findById(storeId: string) {
        const store = stores.get(storeId);
        return store ? { ...store } : null;
      },
    },
    organizationMembershipRepository: {
      async findByUserAndOrganization(userId: string, organizationId: string) {
        const membership = memberships.get(`${userId}:${organizationId}`);
        return membership ? { ...membership } : null;
      },
    },
    orderRepository: {
      async findById(orderId: string) {
        const order = orders.find((o) => o.id === orderId);
        return order ? cloneOrder(order) : null;
      },
      async listByStore(input: {
        storeId: string;
        status?: string;
        paymentStatus?: string;
        businessDate?: string;
        q?: string;
        skip: number;
        limit: number;
      }) {
        let filtered = orders.filter((o) => o.storeId === input.storeId);

        if (input.status !== undefined) {
          filtered = filtered.filter((o) => o.status === input.status);
        }
        if (input.paymentStatus !== undefined) {
          filtered = filtered.filter(
            (o) => o.paymentStatus === input.paymentStatus,
          );
        }
        if (input.businessDate !== undefined) {
          filtered = filtered.filter(
            (o) => o.businessDate === input.businessDate,
          );
        }
        if (input.q !== undefined && input.q.trim().length > 0) {
          const q = input.q.toLowerCase();
          filtered = filtered.filter(
            (o) =>
              o.displayNumber.toLowerCase().includes(q) ||
              (o.tableNumber?.toLowerCase() ?? '').includes(q),
          );
        }

        return filtered
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(input.skip, input.skip + input.limit)
          .map(cloneOrder);
      },
      async countByStore(input: {
        storeId: string;
        status?: string;
        paymentStatus?: string;
        businessDate?: string;
        q?: string;
      }) {
        let filtered = orders.filter((o) => o.storeId === input.storeId);

        if (input.status !== undefined) {
          filtered = filtered.filter((o) => o.status === input.status);
        }
        if (input.paymentStatus !== undefined) {
          filtered = filtered.filter(
            (o) => o.paymentStatus === input.paymentStatus,
          );
        }
        if (input.businessDate !== undefined) {
          filtered = filtered.filter(
            (o) => o.businessDate === input.businessDate,
          );
        }
        if (input.q !== undefined && input.q.trim().length > 0) {
          const q = input.q.toLowerCase();
          filtered = filtered.filter(
            (o) =>
              o.displayNumber.toLowerCase().includes(q) ||
              (o.tableNumber?.toLowerCase() ?? '').includes(q),
          );
        }

        return filtered.length;
      },
      async update(
        orderId: string,
        input: Record<string, unknown>,
        options?: { expectedUpdatedAt?: Date },
      ) {
        const index = orders.findIndex((o) => o.id === orderId);
        if (index === -1) return null;

        const order = orders[index]!;

        // Optimistic concurrency check
        if (options?.expectedUpdatedAt !== undefined) {
          if (
            order.updatedAt.getTime() !== options.expectedUpdatedAt.getTime()
          ) {
            return null;
          }
        }

        const updated: TestOrder = {
          ...order,
          ...Object.fromEntries(
            Object.entries(input).filter(([, v]) => v !== undefined),
          ),
          updatedAt: new Date(),
        };
        orders[index] = updated;
        return cloneOrder(updated);
      },
    },
    sseEmissions,
    reset() {
      users.clear();
      stores.clear();
      memberships.clear();
      orders = [];
      orderCounter = 1;
      sseEmissions.length = 0;
    },
    addUser(id: string) {
      users.set(id, {
        id,
        email: `${id}@example.com`,
        username: id,
        isSuperAdmin: false,
        status: 'active',
        tokenVersion: 1,
      });
    },
    addStore(id: string, organizationId: string) {
      stores.set(id, { id, organizationId });
    },
    setMembership(userId: string, organizationId: string, role: TestRole) {
      memberships.set(`${userId}:${organizationId}`, {
        role,
        status: 'active',
      });
    },
    addOrder(partial: Partial<TestOrder> = {}): TestOrder {
      const now = new Date();
      const id = `order-${orderCounter}`;
      const displayNumber = String(orderCounter).padStart(4, '0');
      orderCounter += 1;

      const order: TestOrder = {
        id,
        organizationId: 'org-1',
        storeId: 'store-1',
        orderType: 'dine_in',
        checkoutMode: 'pay_later',
        businessDate: '2026-06-28',
        dailySequence: orderCounter,
        displayNumber,
        status: 'preparing',
        paymentStatus: 'unpaid',
        participants: [
          { id: 'participant-1', avatarKey: 'bear', joinedAt: now },
        ],
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: { en: 'Latte' },
            quantity: 2,
            unitPrice: 120,
            totalItemPrice: 240,
            selectedOptions: [],
            createdAt: now,
          },
        ],
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'preparing',
            submittedAt: now,
            submittedByParticipantId: 'participant-1',
            items: [
              {
                id: 'item-1',
                productId: 'product-1',
                productName: { en: 'Latte' },
                quantity: 2,
                unitPrice: 120,
                totalItemPrice: 240,
                selectedOptions: [],
                createdAt: now,
              },
            ],
            subtotal: 240,
          },
        ],
        subtotal: 240,
        serviceFeeRate: 0.1,
        serviceFeeAmount: 24,
        totalAmount: 264,
        orderingClosesAt: new Date(now.getTime() + 60 * 60 * 1000),
        createdAt: now,
        updatedAt: now,
        ...partial,
      };

      orders.push(order);
      return order;
    },
  };
});

vi.mock('@src/repositories/user/repository', () => ({
  userRepository: mocks.userRepository,
}));

vi.mock('@src/repositories/store/repository', () => ({
  storeRepository: mocks.storeRepository,
}));

vi.mock('@src/repositories/organizationMembership/repository', () => ({
  organizationMembershipRepository: mocks.organizationMembershipRepository,
}));

vi.mock('@src/repositories/order/repository', () => ({
  orderRepository: mocks.orderRepository,
}));

vi.mock('@src/services/guestOrdering', () => ({
  guestOrderingService: {
    notifyOrderUpdated: (cartId: string, order: unknown) => {
      mocks.sseEmissions.push({ cartId, order });
    },
  },
}));

function createAccessToken(userId: string) {
  return sign(
    { sub: userId, isSuperAdmin: false, tokenVersion: 1, type: 'access' },
    process.env.AUTH_ACCESS_TOKEN_SECRET ?? '',
    { expiresIn: '15m' },
  );
}

function seedMember(role: TestRole = 'org_owner') {
  mocks.addUser('user-1');
  mocks.addStore('store-1', 'org-1');
  mocks.setMembership('user-1', 'org-1', role);
}

describe('merchant orders API', () => {
  beforeEach(() => {
    mocks.reset();
  });

  describe('GET /api/v1/merchant/stores/:storeId/orders', () => {
    it('returns an empty list when there are no orders', async () => {
      seedMember();
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .get('/api/v1/merchant/stores/store-1/orders')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        data: {
          orders: [],
          total: 0,
          page: 1,
          pageSize: 20,
        },
      });
    });

    it('returns orders with summary fields', async () => {
      seedMember();
      mocks.addOrder({ tableNumber: 'A3', displayNumber: '0001' });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .get('/api/v1/merchant/stores/store-1/orders')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const { orders, total, page, pageSize } = response.body.data as {
        orders: unknown[];
        total: number;
        page: number;
        pageSize: number;
      };

      expect(total).toBe(1);
      expect(page).toBe(1);
      expect(pageSize).toBe(20);
      expect(orders).toHaveLength(1);
      expect(orders[0]).toMatchObject({
        id: 'order-1',
        displayNumber: '0001',
        status: 'preparing',
        paymentStatus: 'unpaid',
        tableNumber: 'A3',
        participantCount: 1,
        itemCount: 2,
        totalAmount: 264,
      });
      // Summary should NOT expose items or batches arrays
      expect((orders[0] as Record<string, unknown>).items).toBeUndefined();
      expect((orders[0] as Record<string, unknown>).batches).toBeUndefined();
    });

    it('paginates correctly', async () => {
      seedMember();
      for (let i = 0; i < 5; i++) {
        mocks.addOrder();
      }
      const app = createApp();
      const token = createAccessToken('user-1');

      const page1 = await request(app)
        .get('/api/v1/merchant/stores/store-1/orders?page=1&pageSize=2')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(page1.body.data.total).toBe(5);
      expect(page1.body.data.page).toBe(1);
      expect(page1.body.data.pageSize).toBe(2);
      expect(page1.body.data.orders).toHaveLength(2);

      const page2 = await request(app)
        .get('/api/v1/merchant/stores/store-1/orders?page=2&pageSize=2')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(page2.body.data.orders).toHaveLength(2);
      expect(page2.body.data.page).toBe(2);
    });

    it('filters by status', async () => {
      seedMember();
      mocks.addOrder({ status: 'preparing' });
      mocks.addOrder({ status: 'completed' });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .get('/api/v1/merchant/stores/store-1/orders?status=preparing')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.total).toBe(1);
      expect(response.body.data.orders[0]).toMatchObject({
        status: 'preparing',
      });
    });

    it('filters by paymentStatus', async () => {
      seedMember();
      mocks.addOrder({ paymentStatus: 'unpaid' });
      mocks.addOrder({ paymentStatus: 'paid' });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .get('/api/v1/merchant/stores/store-1/orders?paymentStatus=paid')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.total).toBe(1);
      expect(response.body.data.orders[0]).toMatchObject({
        paymentStatus: 'paid',
      });
    });

    it('filters by businessDate', async () => {
      seedMember();
      mocks.addOrder({ businessDate: '2026-06-28' });
      mocks.addOrder({ businessDate: '2026-06-27' });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .get('/api/v1/merchant/stores/store-1/orders?businessDate=2026-06-28')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.total).toBe(1);
      expect(response.body.data.orders[0]).toMatchObject({
        businessDate: '2026-06-28',
      });
    });

    it('searches by q against displayNumber', async () => {
      seedMember();
      mocks.addOrder({ displayNumber: '0001' });
      mocks.addOrder({ displayNumber: '0002' });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .get('/api/v1/merchant/stores/store-1/orders?q=0001')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.total).toBe(1);
      expect(response.body.data.orders[0]).toMatchObject({
        displayNumber: '0001',
      });
    });

    it('searches by q against tableNumber', async () => {
      seedMember();
      mocks.addOrder({ tableNumber: 'A1' });
      mocks.addOrder({ tableNumber: 'B2' });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .get('/api/v1/merchant/stores/store-1/orders?q=a1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.total).toBe(1);
      expect(response.body.data.orders[0]).toMatchObject({ tableNumber: 'A1' });
    });

    it('returns 403 when caller has no org role', async () => {
      mocks.addUser('user-1');
      mocks.addStore('store-1', 'org-1');
      // no membership set
      const app = createApp();
      const token = createAccessToken('user-1');

      await request(app)
        .get('/api/v1/merchant/stores/store-1/orders')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('returns 401 when unauthenticated', async () => {
      const app = createApp();

      await request(app)
        .get('/api/v1/merchant/stores/store-1/orders')
        .expect(401);
    });

    it('allows staff role to list orders', async () => {
      seedMember('staff');
      const app = createApp();
      const token = createAccessToken('user-1');

      await request(app)
        .get('/api/v1/merchant/stores/store-1/orders')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('GET /api/v1/merchant/stores/:storeId/orders/:orderId', () => {
    it('returns full order detail', async () => {
      seedMember();
      const order = mocks.addOrder({
        displayNumber: '0001',
        tableNumber: 'A3',
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .get(`/api/v1/merchant/stores/store-1/orders/${order.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.order).toMatchObject({
        id: order.id,
        displayNumber: '0001',
        tableNumber: 'A3',
        status: 'preparing',
        paymentStatus: 'unpaid',
      });
      // Detail includes full arrays
      expect(Array.isArray(response.body.data.order.batches)).toBe(true);
      expect(Array.isArray(response.body.data.order.items)).toBe(true);
      expect(Array.isArray(response.body.data.order.participants)).toBe(true);
    });

    it('returns 404 when order does not exist', async () => {
      seedMember();
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .get('/api/v1/merchant/stores/store-1/orders/order-nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.code).toBe('ORDER_NOT_FOUND');
    });

    it('returns 404 when order belongs to a different store', async () => {
      seedMember();
      const order = mocks.addOrder({ storeId: 'store-other' });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .get(`/api/v1/merchant/stores/store-1/orders/${order.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.code).toBe('ORDER_NOT_FOUND');
    });

    it('returns 403 when caller has no org role', async () => {
      mocks.addUser('user-1');
      mocks.addStore('store-1', 'org-1');
      const order = mocks.addOrder();
      const app = createApp();
      const token = createAccessToken('user-1');

      await request(app)
        .get(`/api/v1/merchant/stores/store-1/orders/${order.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('allows staff role to get order detail', async () => {
      seedMember('staff');
      const order = mocks.addOrder();
      const app = createApp();
      const token = createAccessToken('user-1');

      await request(app)
        .get(`/api/v1/merchant/stores/store-1/orders/${order.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('PATCH /api/v1/merchant/stores/:storeId/orders/:orderId/cancel', () => {
    it('cancels a preparing order and persists cancelReasons/cancelNote/cancelledBy/cancelledAt', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'preparing',
        paymentStatus: 'unpaid',
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reasons: ['no_show', 'other'], note: 'Guest did not arrive' })
        .expect(200);

      expect(response.body.status).toBe('success');
      const returned = response.body.data.order as Record<string, unknown>;
      expect(returned.status).toBe('cancelled');
      expect(returned.cancelReasons).toEqual(['no_show', 'other']);
      expect(returned.cancelNote).toBe('Guest did not arrive');
      expect(returned.cancelledBy).toBe('user-1');
      expect(returned.cancelledAt).toBeDefined();
    });

    it('zeroes the order totals on cancel (a cancelled order is no revenue)', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'preparing',
        paymentStatus: 'unpaid',
        subtotal: 195,
        serviceFeeAmount: 20,
        totalAmount: 215,
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reasons: ['customer_request'] })
        .expect(200);

      const returned = response.body.data.order;
      expect(returned.status).toBe('cancelled');
      expect(returned.subtotal).toBe(0);
      expect(returned.serviceFeeAmount).toBe(0);
      expect(returned.totalAmount).toBe(0);
      expect(returned.items).toEqual([]);
    });

    it('accepts note-only cancel (no reasons)', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'preparing',
        paymentStatus: 'unpaid',
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ note: 'special case' })
        .expect(200);

      expect(response.body.data.order.status).toBe('cancelled');
    });

    it('returns 400 when neither reasons nor note provided', async () => {
      seedMember();
      const order = mocks.addOrder({ status: 'preparing' });
      const app = createApp();
      const token = createAccessToken('user-1');

      await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });

    it.each([
      'pending_payment',
      'pending_confirmation',
      'preparing',
      'ready',
    ] as const)('cancels an order in status "%s"', async (status) => {
      seedMember();
      const order = mocks.addOrder({ status, paymentStatus: 'unpaid' });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reasons: ['customer_request'] })
        .expect(200);

      expect(response.body.data.order.status).toBe('cancelled');
    });

    it('returns 409 ORDER_LOCKED when order is already completed', async () => {
      seedMember();
      const order = mocks.addOrder({ status: 'completed' });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reasons: ['other'] })
        .expect(409);

      expect(response.body.code).toBe('ORDER_LOCKED');
    });

    it('returns 409 ORDER_LOCKED when order is already cancelled', async () => {
      seedMember();
      const order = mocks.addOrder({ status: 'cancelled' });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reasons: ['other'] })
        .expect(409);

      expect(response.body.code).toBe('ORDER_LOCKED');
    });

    it('sets paymentStatus to voided when cancelling a paid order', async () => {
      seedMember();
      const order = mocks.addOrder({ status: 'ready', paymentStatus: 'paid' });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reasons: ['out_of_stock'] })
        .expect(200);

      expect(response.body.data.order.paymentStatus).toBe('voided');
      expect(response.body.data.order.status).toBe('cancelled');
    });

    it('emits SSE update when cartId is present', async () => {
      seedMember();
      const order = mocks.addOrder({ status: 'preparing', cartId: 'cart-1' });
      const app = createApp();
      const token = createAccessToken('user-1');

      await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reasons: ['no_show'] })
        .expect(200);

      expect(mocks.sseEmissions).toHaveLength(1);
      expect(mocks.sseEmissions[0]!.cartId).toBe('cart-1');
    });

    it('does not emit SSE when cartId is absent', async () => {
      seedMember();
      const order = mocks.addOrder({ status: 'preparing' }); // no cartId
      const app = createApp();
      const token = createAccessToken('user-1');

      await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reasons: ['no_show'] })
        .expect(200);

      expect(mocks.sseEmissions).toHaveLength(0);
    });

    it('returns 403 when staff tries to cancel', async () => {
      seedMember('staff');
      const order = mocks.addOrder({ status: 'preparing' });
      const app = createApp();
      const token = createAccessToken('user-1');

      await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reasons: ['no_show'] })
        .expect(403);
    });

    it('allows org_admin to cancel', async () => {
      seedMember('org_admin');
      const order = mocks.addOrder({ status: 'preparing' });
      const app = createApp();
      const token = createAccessToken('user-1');

      await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reasons: ['no_show'] })
        .expect(200);
    });

    it('returns 409 ORDER_LOCKED when expectedUpdatedAt is stale', async () => {
      seedMember();
      const order = mocks.addOrder({ status: 'preparing' });
      const app = createApp();
      const token = createAccessToken('user-1');

      const staleDate = new Date(
        order.updatedAt.getTime() - 5000,
      ).toISOString();

      const response = await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reasons: ['no_show'], expectedUpdatedAt: staleDate })
        .expect(409);

      expect(response.body.code).toBe('ORDER_LOCKED');
    });

    it('returns 404 when order does not exist', async () => {
      seedMember();
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(
          '/api/v1/merchant/stores/store-1/orders/order-nonexistent/cancel',
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ reasons: ['no_show'] })
        .expect(404);

      expect(response.body.code).toBe('ORDER_NOT_FOUND');
    });
  });

  describe('pure model helpers', () => {
    describe('rollupOrderStatus', () => {
      const batch = (status: string) => ({
        id: 'b1',
        batchNumber: 1,
        status,
        submittedAt: new Date(),
        items: [],
        subtotal: 0,
      });

      it('returns slowest active stage', () => {
        // pending_confirmation is slower than preparing
        expect(
          rollupOrderStatus([
            batch('pending_confirmation'),
            batch('preparing'),
          ]),
        ).toBe('pending_confirmation');
      });

      it('returns ready when all active batches are ready', () => {
        expect(rollupOrderStatus([batch('ready'), batch('ready')])).toBe(
          'ready',
        );
      });

      it('returns completed for a paid pay-later order when all active batches are ready', () => {
        expect(
          rollupOrderStatus([batch('ready'), batch('ready')], {
            checkoutMode: 'pay_later',
            paymentStatus: 'paid',
          }),
        ).toBe('completed');
      });

      it('stays open (pending_confirmation) when all batches are cancelled individually', () => {
        // Cancelling every round rejects food but does not end the table; the
        // order stays open so the guest can add another round. Terminal
        // 'cancelled' is reserved for an explicit order-level cancel.
        expect(
          rollupOrderStatus([batch('cancelled'), batch('cancelled')]),
        ).toBe('pending_confirmation');
      });

      it('ignores cancelled batches in slowest-stage calculation', () => {
        // mixed: one cancelled, one ready → ready (only active)
        expect(rollupOrderStatus([batch('cancelled'), batch('ready')])).toBe(
          'ready',
        );
      });

      it('returns preparing when mixed ready+preparing', () => {
        expect(rollupOrderStatus([batch('ready'), batch('preparing')])).toBe(
          'preparing',
        );
      });
    });

    describe('canAdvanceBatch', () => {
      it('allows forward advancement', () => {
        expect(canAdvanceBatch('pending_confirmation', 'preparing')).toBe(true);
        expect(canAdvanceBatch('preparing', 'ready')).toBe(true);
      });

      it('allows skipping a stage (pending_confirmation → ready)', () => {
        expect(canAdvanceBatch('pending_confirmation', 'ready')).toBe(true);
      });

      it('rejects same-stage', () => {
        expect(canAdvanceBatch('preparing', 'preparing')).toBe(false);
      });

      it('rejects backward', () => {
        expect(canAdvanceBatch('ready', 'preparing')).toBe(false);
      });

      it('rejects from cancelled', () => {
        expect(canAdvanceBatch('cancelled', 'preparing')).toBe(false);
      });

      it('rejects from ready (terminal prep stage)', () => {
        expect(canAdvanceBatch('ready', 'ready')).toBe(false);
      });
    });

    describe('canCompleteOrder', () => {
      const makeOrder = (batchStatuses: string[]) => ({
        id: 'order-1',
        organizationId: 'org-1',
        storeId: 'store-1',
        orderType: 'dine_in' as const,
        checkoutMode: 'pay_first' as const,
        businessDate: '2026-06-28',
        dailySequence: 1,
        displayNumber: '0001',
        status: 'ready' as const,
        paymentStatus: 'paid' as const,
        participants: [],
        items: [],
        batches: batchStatuses.map((s, i) => ({
          id: `batch-${i + 1}`,
          batchNumber: i + 1,
          status: s as never,
          submittedAt: new Date(),
          items: [],
          subtotal: 0,
        })),
        subtotal: 0,
        serviceFeeRate: 0,
        serviceFeeAmount: 0,
        totalAmount: 0,
        orderingClosesAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      it('allows completion when all batches ready', () => {
        expect(canCompleteOrder(makeOrder(['ready', 'ready']))).toBe(true);
      });

      it('rejects completion before payment is collected', () => {
        const order = {
          ...makeOrder(['ready', 'ready']),
          paymentStatus: 'unpaid' as const,
        };

        expect(canCompleteOrder(order)).toBe(false);
      });

      it('allows completion when all batches ready or cancelled (some cancelled)', () => {
        expect(canCompleteOrder(makeOrder(['ready', 'cancelled']))).toBe(true);
      });

      it('rejects when any active batch is not ready', () => {
        expect(canCompleteOrder(makeOrder(['ready', 'preparing']))).toBe(false);
        expect(
          canCompleteOrder(makeOrder(['ready', 'pending_confirmation'])),
        ).toBe(false);
      });

      it('rejects when all batches are cancelled (no active ready)', () => {
        expect(canCompleteOrder(makeOrder(['cancelled', 'cancelled']))).toBe(
          false,
        );
      });

      it('rejects when order is already completed', () => {
        const order = { ...makeOrder(['ready']), status: 'completed' as const };
        expect(canCompleteOrder(order)).toBe(false);
      });

      it('rejects when order is cancelled', () => {
        const order = {
          ...makeOrder(['cancelled']),
          status: 'cancelled' as const,
        };
        expect(canCompleteOrder(order)).toBe(false);
      });
    });

    describe('computeActiveOrderTotals', () => {
      const batch = (id: string, status: string, prices: number[]) => ({
        id,
        batchNumber: 1,
        status,
        submittedAt: new Date(),
        items: prices.map((p, i) => ({
          id: `${id}-item-${i}`,
          productId: 'p',
          productName: { en: 'p' },
          quantity: 1,
          unitPrice: p,
          totalItemPrice: p,
          selectedOptions: [],
        })),
        subtotal: prices.reduce((s, p) => s + p, 0),
      });

      it('excludes cancelled batches from items and totals', () => {
        const totals = computeActiveOrderTotals(
          [batch('b1', 'ready', [20]), batch('b2', 'cancelled', [15])] as never,
          0.1,
        );

        expect(totals.items).toHaveLength(1);
        expect(totals.subtotal).toBe(20);
        expect(totals.serviceFeeAmount).toBe(2);
        expect(totals.totalAmount).toBe(22);
      });

      it('sums all batches when none cancelled', () => {
        const totals = computeActiveOrderTotals(
          [batch('b1', 'ready', [20]), batch('b2', 'preparing', [15])] as never,
          0.1,
        );

        expect(totals.subtotal).toBe(35);
        expect(totals.totalAmount).toBe(39);
      });
    });
  });

  describe('PATCH /api/v1/merchant/stores/:storeId/orders/:orderId/batches/:batchId/status', () => {
    it('advances batch from pending_confirmation to preparing', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'pending_confirmation',
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'pending_confirmation',
            submittedAt: new Date(),
            submittedByParticipantId: 'participant-1',
            items: [],
            subtotal: 0,
          },
        ],
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(
          `/api/v1/merchant/stores/store-1/orders/${order.id}/batches/batch-1/status`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'preparing' })
        .expect(200);

      expect(response.body.data.order.batches[0].status).toBe('preparing');
      expect(response.body.data.order.status).toBe('preparing');
    });

    it('advances unpaid batch from preparing to ready and order status becomes ready', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'preparing',
        paymentStatus: 'unpaid',
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'preparing',
            submittedAt: new Date(),
            items: [],
            subtotal: 0,
          },
        ],
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(
          `/api/v1/merchant/stores/store-1/orders/${order.id}/batches/batch-1/status`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'ready' })
        .expect(200);

      expect(response.body.data.order.batches[0].status).toBe('ready');
      expect(response.body.data.order.status).toBe('ready');
    });

    it('auto-completes a paid pay-later order when the last active batch becomes ready', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'preparing',
        paymentStatus: 'paid',
        checkoutMode: 'pay_later',
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'preparing',
            submittedAt: new Date(),
            items: [],
            subtotal: 0,
          },
        ],
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(
          `/api/v1/merchant/stores/store-1/orders/${order.id}/batches/batch-1/status`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'ready' })
        .expect(200);

      expect(response.body.data.order.batches[0].status).toBe('ready');
      expect(response.body.data.order.status).toBe('completed');
      expect(response.body.data.order.completedAt).toBeDefined();
    });

    it('rejects advancing a ready batch (terminal prep stage)', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'ready',
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'ready',
            submittedAt: new Date(),
            items: [],
            subtotal: 0,
          },
        ],
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(
          `/api/v1/merchant/stores/store-1/orders/${order.id}/batches/batch-1/status`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'ready' })
        .expect(409);

      expect(response.body.code).toBe('ORDER_LOCKED');
    });

    it('emits SSE on batch advance when cartId present', async () => {
      seedMember();
      const order = mocks.addOrder({
        cartId: 'cart-3',
        status: 'pending_confirmation',
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'pending_confirmation',
            submittedAt: new Date(),
            items: [],
            subtotal: 0,
          },
        ],
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      await request(app)
        .patch(
          `/api/v1/merchant/stores/store-1/orders/${order.id}/batches/batch-1/status`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'preparing' })
        .expect(200);

      expect(mocks.sseEmissions).toHaveLength(1);
      expect(mocks.sseEmissions[0]!.cartId).toBe('cart-3');
    });

    it('returns 409 ORDER_LOCKED when advancing backward', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'ready',
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'ready',
            submittedAt: new Date(),
            items: [],
            subtotal: 0,
          },
        ],
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(
          `/api/v1/merchant/stores/store-1/orders/${order.id}/batches/batch-1/status`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'preparing' })
        .expect(409);

      expect(response.body.code).toBe('ORDER_LOCKED');
    });

    it('returns 409 ORDER_LOCKED when advancing a cancelled batch', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'cancelled',
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'cancelled',
            submittedAt: new Date(),
            items: [],
            subtotal: 0,
          },
        ],
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(
          `/api/v1/merchant/stores/store-1/orders/${order.id}/batches/batch-1/status`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'preparing' })
        .expect(409);

      expect(response.body.code).toBe('ORDER_LOCKED');
    });

    it('returns 403 when staff tries to advance batch', async () => {
      seedMember('staff');
      const order = mocks.addOrder({
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'pending_confirmation',
            submittedAt: new Date(),
            items: [],
            subtotal: 0,
          },
        ],
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      await request(app)
        .patch(
          `/api/v1/merchant/stores/store-1/orders/${order.id}/batches/batch-1/status`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'preparing' })
        .expect(403);
    });

    it('returns 409 when expectedUpdatedAt is stale', async () => {
      seedMember();
      const order = mocks.addOrder({
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'pending_confirmation',
            submittedAt: new Date(),
            items: [],
            subtotal: 0,
          },
        ],
      });
      const app = createApp();
      const token = createAccessToken('user-1');
      const staleDate = new Date(
        order.updatedAt.getTime() - 5000,
      ).toISOString();

      const response = await request(app)
        .patch(
          `/api/v1/merchant/stores/store-1/orders/${order.id}/batches/batch-1/status`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'preparing', expectedUpdatedAt: staleDate })
        .expect(409);

      expect(response.body.code).toBe('ORDER_LOCKED');
    });
  });

  describe('PATCH /api/v1/merchant/stores/:storeId/orders/:orderId/batches/:batchId/cancel', () => {
    it('cancels a batch and persists reasons/note/cancelledBy', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'preparing',
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'preparing',
            submittedAt: new Date(),
            items: [],
            subtotal: 0,
          },
        ],
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(
          `/api/v1/merchant/stores/store-1/orders/${order.id}/batches/batch-1/cancel`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ reasons: ['out_of_stock'], note: 'Ran out of ingredient' })
        .expect(200);

      const batchReturned = response.body.data.order.batches[0] as Record<
        string,
        unknown
      >;
      expect(batchReturned.status).toBe('cancelled');
      expect(batchReturned.cancelReasons).toEqual(['out_of_stock']);
      expect(batchReturned.cancelNote).toBe('Ran out of ingredient');
      expect(batchReturned.cancelledBy).toBe('user-1');
      expect(batchReturned.cancelledAt).toBeDefined();
    });

    it('keeps the order open (pending_confirmation) when the last active batch is cancelled', async () => {
      // Cancelling every round individually rejects food but must NOT end the
      // table: the order stays open so the guest can still add another round.
      seedMember();
      const order = mocks.addOrder({
        status: 'preparing',
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'preparing',
            submittedAt: new Date(),
            items: [],
            subtotal: 0,
          },
        ],
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(
          `/api/v1/merchant/stores/store-1/orders/${order.id}/batches/batch-1/cancel`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ reasons: ['no_show'] })
        .expect(200);

      expect(response.body.data.order.status).toBe('pending_confirmation');
    });

    it('returns 409 ORDER_LOCKED when batch already cancelled', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'cancelled',
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'cancelled',
            submittedAt: new Date(),
            items: [],
            subtotal: 0,
          },
        ],
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(
          `/api/v1/merchant/stores/store-1/orders/${order.id}/batches/batch-1/cancel`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ reasons: ['other'] })
        .expect(409);

      expect(response.body.code).toBe('ORDER_LOCKED');
    });

    it('allows cancelling a ready batch (ready is not terminal for cancel)', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'ready',
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'ready',
            submittedAt: new Date(),
            items: [],
            subtotal: 0,
          },
        ],
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(
          `/api/v1/merchant/stores/store-1/orders/${order.id}/batches/batch-1/cancel`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ reasons: ['other'] })
        .expect(200);

      expect(response.body.data.order.batches[0].status).toBe('cancelled');
    });

    it('returns 403 when staff tries to cancel batch', async () => {
      seedMember('staff');
      const order = mocks.addOrder({
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'preparing',
            submittedAt: new Date(),
            items: [],
            subtotal: 0,
          },
        ],
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      await request(app)
        .patch(
          `/api/v1/merchant/stores/store-1/orders/${order.id}/batches/batch-1/cancel`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ reasons: ['other'] })
        .expect(403);
    });
  });

  describe('PATCH /api/v1/merchant/stores/:storeId/orders/:orderId/complete', () => {
    it('completes an order when all batches are ready', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'ready',
        paymentStatus: 'paid',
        checkoutMode: 'pay_first',
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'ready',
            submittedAt: new Date(),
            items: [],
            subtotal: 0,
          },
        ],
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(response.body.data.order.status).toBe('completed');
      expect(response.body.data.order.completedAt).toBeDefined();
    });

    it('completes when some batches are cancelled and at least one ready', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'ready',
        paymentStatus: 'paid',
        checkoutMode: 'pay_first',
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'ready',
            submittedAt: new Date(),
            items: [],
            subtotal: 0,
          },
          {
            id: 'batch-2',
            batchNumber: 2,
            status: 'cancelled',
            submittedAt: new Date(),
            items: [],
            subtotal: 0,
          },
        ],
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(response.body.data.order.status).toBe('completed');
    });

    it('returns 409 ORDER_LOCKED when any batch is still preparing (not all ready/cancelled)', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'preparing',
        paymentStatus: 'paid',
        checkoutMode: 'pay_first',
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'preparing',
            submittedAt: new Date(),
            items: [],
            subtotal: 0,
          },
        ],
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(409);

      expect(response.body.code).toBe('ORDER_LOCKED');
    });

    it('returns 409 ORDER_LOCKED when payment has not been collected', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'ready',
        paymentStatus: 'unpaid',
        checkoutMode: 'pay_first',
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'ready',
            submittedAt: new Date(),
            items: [],
            subtotal: 0,
          },
        ],
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(409);

      expect(response.body.code).toBe('ORDER_LOCKED');
    });

    it('returns 403 when staff tries to complete', async () => {
      seedMember('staff');
      const order = mocks.addOrder({
        status: 'ready',
        paymentStatus: 'paid',
        checkoutMode: 'pay_first',
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'ready',
            submittedAt: new Date(),
            items: [],
            subtotal: 0,
          },
        ],
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(403);
    });

    it('returns 409 when expectedUpdatedAt is stale', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'ready',
        paymentStatus: 'paid',
        checkoutMode: 'pay_first',
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'ready',
            submittedAt: new Date(),
            items: [],
            subtotal: 0,
          },
        ],
      });
      const app = createApp();
      const token = createAccessToken('user-1');
      const staleDate = new Date(
        order.updatedAt.getTime() - 5000,
      ).toISOString();

      const response = await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ expectedUpdatedAt: staleDate })
        .expect(409);

      expect(response.body.code).toBe('ORDER_LOCKED');
    });
  });

  describe('PATCH /api/v1/merchant/stores/:storeId/orders/:orderId/checkout', () => {
    it('marks a pay_later unpaid order as paid without completing while batches are not ready', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'preparing',
        paymentStatus: 'unpaid',
        checkoutMode: 'pay_later',
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/checkout`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(response.body.data.order.paymentStatus).toBe('paid');
      expect(response.body.data.order.paidAt).toBeDefined();
      expect(response.body.data.order.status).toBe('preparing');
      expect(response.body.data.order.completedAt).toBeUndefined();
    });

    it('marks a ready pay_later unpaid order as paid and completed', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'ready',
        paymentStatus: 'unpaid',
        checkoutMode: 'pay_later',
        batches: [
          {
            id: 'batch-1',
            batchNumber: 1,
            status: 'ready',
            submittedAt: new Date(),
            items: [],
            subtotal: 0,
          },
        ],
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/checkout`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(response.body.data.order.paymentStatus).toBe('paid');
      expect(response.body.data.order.paidAt).toBeDefined();
      expect(response.body.data.order.status).toBe('completed');
      expect(response.body.data.order.completedAt).toBeDefined();
    });

    it('marks a pay_first unpaid order as paid but does NOT auto-complete', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'preparing',
        paymentStatus: 'unpaid',
        checkoutMode: 'pay_first',
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/checkout`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(response.body.data.order.paymentStatus).toBe('paid');
      expect(response.body.data.order.paidAt).toBeDefined();
      // pay_first: status unchanged — completed requires explicit Complete action
      expect(response.body.data.order.status).toBe('preparing');
      expect(response.body.data.order.completedAt).toBeUndefined();
    });

    it('advances status from pending_payment to pending_confirmation on checkout for pay_first', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'pending_payment',
        paymentStatus: 'unpaid',
        checkoutMode: 'pay_first',
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/checkout`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(response.body.data.order.paymentStatus).toBe('paid');
      expect(response.body.data.order.status).toBe('pending_confirmation');
    });

    it('returns 409 ORDER_LOCKED when order is already paid', async () => {
      seedMember();
      const order = mocks.addOrder({ paymentStatus: 'paid' });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/checkout`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(409);

      expect(response.body.code).toBe('ORDER_LOCKED');
    });

    it('returns 409 ORDER_LOCKED when order is cancelled', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'cancelled',
        paymentStatus: 'voided',
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/checkout`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(409);

      expect(response.body.code).toBe('ORDER_LOCKED');
    });

    it('emits SSE update on checkout when cartId is present', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'preparing',
        paymentStatus: 'unpaid',
        cartId: 'cart-2',
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/checkout`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(mocks.sseEmissions).toHaveLength(1);
      expect(mocks.sseEmissions[0]!.cartId).toBe('cart-2');
    });

    it('returns 403 when staff tries to checkout', async () => {
      seedMember('staff');
      const order = mocks.addOrder({
        status: 'preparing',
        paymentStatus: 'unpaid',
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/checkout`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(403);
    });

    it('allows org_admin to checkout', async () => {
      seedMember('org_admin');
      const order = mocks.addOrder({
        status: 'preparing',
        paymentStatus: 'unpaid',
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/checkout`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);
    });

    it('returns 409 ORDER_LOCKED when expectedUpdatedAt is stale', async () => {
      seedMember();
      const order = mocks.addOrder({
        status: 'preparing',
        paymentStatus: 'unpaid',
      });
      const app = createApp();
      const token = createAccessToken('user-1');

      const staleDate = new Date(
        order.updatedAt.getTime() - 5000,
      ).toISOString();

      const response = await request(app)
        .patch(`/api/v1/merchant/stores/store-1/orders/${order.id}/checkout`)
        .set('Authorization', `Bearer ${token}`)
        .send({ expectedUpdatedAt: staleDate })
        .expect(409);

      expect(response.body.code).toBe('ORDER_LOCKED');
    });

    it('returns 404 when order does not exist', async () => {
      seedMember();
      const app = createApp();
      const token = createAccessToken('user-1');

      const response = await request(app)
        .patch(
          '/api/v1/merchant/stores/store-1/orders/order-nonexistent/checkout',
        )
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(404);

      expect(response.body.code).toBe('ORDER_NOT_FOUND');
    });
  });
});
