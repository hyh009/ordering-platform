import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';

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
  servedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
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
    },
    reset() {
      users.clear();
      stores.clear();
      memberships.clear();
      orders = [];
      orderCounter = 1;
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
});
