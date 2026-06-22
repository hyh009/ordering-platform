import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';

type LocalizedName = { en?: string; 'zh-TW'?: string };

type TestStore = {
  id: string;
  organizationId: string;
  profile: { displayName: LocalizedName; description?: LocalizedName };
  locale: { defaultLocale: 'en'; supportedLocales: ['en'] };
  operation: {
    businessHours: {
      dayOfWeek: number;
      isOpen: boolean;
      openTime?: string;
      closeTime?: string;
    }[];
    serviceFeeRate: number;
    orderModes: {
      type: 'dine_in' | 'takeaway';
      isEnabled: boolean;
      checkoutMode: 'pay_first' | 'pay_later';
    }[];
    guestOrderingDurationMinutes?: number;
  };
  status: 'active' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
};

type TestProduct = {
  id: string;
  organizationId: string;
  storeId: string;
  categoryIds: string[];
  name: LocalizedName;
  description?: LocalizedName;
  imageUrls: string[];
  price: number;
  tagIds: string[];
  allergenIds: string[];
  dietaryMarkerIds: string[];
  modifierIds: string[];
  status: 'draft' | 'published';
  isActive: boolean;
  isSoldOut: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type TestModifier = {
  id: string;
  storeId: string;
  name: LocalizedName;
  selectionType: 'single_choice' | 'multiple_choice';
  minSelect: number;
  maxSelect: number;
  options: {
    id: string;
    name: LocalizedName;
    priceAdjustment: number;
    isDefault: boolean;
    isActive: boolean;
    isSoldOut: boolean;
  }[];
  inheritCategoryAvailability: boolean;
  availabilityRules: never[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type TestCart = Record<string, unknown> & {
  id: string;
  storeId: string;
  status: 'active' | 'checked_out' | 'abandoned';
  joinCode?: string;
  participants: { id: string; displayName?: string; joinedAt: Date }[];
  items: { id: string; addedByParticipantId?: string }[];
  orderId?: string;
  expiresAt: Date;
  orderingClosesAt?: Date;
  updatedAt: Date;
};

type TestOrder = Record<string, unknown> & {
  id: string;
  storeId: string;
  status: string;
  paymentStatus: string;
  checkoutMode: string;
  participants: { id: string; displayName?: string; joinedAt: Date }[];
  batches: { batchNumber: number }[];
  orderingClosesAt: Date;
  updatedAt: Date;
};

const mocks = vi.hoisted(() => {
  const stores = new Map<string, TestStore>();
  const products = new Map<string, TestProduct>();
  const modifiers: TestModifier[] = [];
  const carts = new Map<string, TestCart>();
  const orders = new Map<string, TestOrder>();
  const counters = new Map<string, number>();
  let idCounter = 1;

  const nextId = (prefix: string) => `${prefix}-${idCounter++}`;
  const clone = <T>(value: T): T => structuredClone(value);

  const applySet = (
    target: Record<string, unknown>,
    input: Record<string, unknown>,
  ) => {
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        target[key] = value;
      }
    }
    target.updatedAt = new Date((target.updatedAt as Date).getTime() + 1);
  };

  return {
    stores,
    products,
    modifiers,
    carts,
    orders,
    counters,
    nextId,
    clone,
    reset() {
      stores.clear();
      products.clear();
      modifiers.length = 0;
      carts.clear();
      orders.clear();
      counters.clear();
      idCounter = 1;
    },
    storeRepository: {
      async findById(storeId: string) {
        const store = stores.get(storeId);
        return store ? clone(store) : null;
      },
    },
    productRepository: {
      async findById(productId: string) {
        const product = products.get(productId);
        return product ? clone(product) : null;
      },
      async listByStore(input: { storeId: string; isActive?: boolean }) {
        return [...products.values()]
          .filter(
            (product) =>
              product.storeId === input.storeId &&
              (input.isActive === undefined ||
                product.isActive === input.isActive),
          )
          .map(clone);
      },
    },
    productModifierRepository: {
      async listByStore(input: { storeId: string; isActive?: boolean }) {
        return modifiers
          .filter(
            (modifier) =>
              modifier.storeId === input.storeId &&
              (input.isActive === undefined ||
                modifier.isActive === input.isActive),
          )
          .map(clone);
      },
    },
    categoryRepository: {
      async listByStore() {
        return [];
      },
    },
    allergenRepository: {
      async list() {
        return [];
      },
    },
    dietaryMarkerRepository: {
      async list() {
        return [];
      },
    },
    cartRepository: {
      async create(input: Record<string, unknown>) {
        const now = new Date();
        const cart = {
          id: nextId('cart'),
          status: 'active',
          items: [],
          subtotal: 0,
          serviceFeeAmount: 0,
          totalAmount: 0,
          ...input,
          createdAt: now,
          updatedAt: now,
        } as unknown as TestCart;
        carts.set(cart.id, cart);
        return clone(cart);
      },
      async findById(cartId: string) {
        const cart = carts.get(cartId);
        return cart ? clone(cart) : null;
      },
      async findByJoinCode(joinCode: string) {
        const cart = [...carts.values()].find(
          (candidate) => candidate.joinCode === joinCode,
        );
        return cart ? clone(cart) : null;
      },
      async update(
        cartId: string,
        input: Record<string, unknown>,
        options?: { expectedUpdatedAt?: Date },
      ) {
        const cart = carts.get(cartId);
        if (!cart) return null;
        if (
          options?.expectedUpdatedAt !== undefined &&
          cart.updatedAt.getTime() !== options.expectedUpdatedAt.getTime()
        ) {
          return null;
        }
        applySet(cart, input);
        return clone(cart);
      },
    },
    orderRepository: {
      async create(input: Record<string, unknown>) {
        const now = new Date();
        const order = {
          id: nextId('order'),
          ...input,
          createdAt: now,
          updatedAt: now,
        } as unknown as TestOrder;
        orders.set(order.id, order);
        return clone(order);
      },
      async findById(orderId: string) {
        const order = orders.get(orderId);
        return order ? clone(order) : null;
      },
      async findByStoreAndParticipant(storeId: string, participantId: string) {
        const order = [...orders.values()].find(
          (candidate) =>
            candidate.storeId === storeId &&
            candidate.participants.some(
              (participant) => participant.id === participantId,
            ),
        );
        return order ? clone(order) : null;
      },
      async update(
        orderId: string,
        input: Record<string, unknown>,
        options?: { expectedUpdatedAt?: Date },
      ) {
        const order = orders.get(orderId);
        if (!order) return null;
        if (
          options?.expectedUpdatedAt !== undefined &&
          order.updatedAt.getTime() !== options.expectedUpdatedAt.getTime()
        ) {
          return null;
        }
        applySet(order, input);
        return clone(order);
      },
    },
    counterRepository: {
      async nextDailyOrderSequence(storeId: string, businessDate: string) {
        const key = `${storeId}:${businessDate}`;
        const next = (counters.get(key) ?? 0) + 1;
        counters.set(key, next);
        return next;
      },
    },
  };
});

vi.mock('@src/repositories/store/repository', () => ({
  storeRepository: mocks.storeRepository,
}));

vi.mock('@src/repositories/product/repository', () => ({
  productRepository: mocks.productRepository,
}));

vi.mock('@src/repositories/productModifier/repository', () => ({
  productModifierRepository: mocks.productModifierRepository,
}));

vi.mock('@src/repositories/category/repository', () => ({
  categoryRepository: mocks.categoryRepository,
}));

vi.mock('@src/repositories/allergen/repository', () => ({
  allergenRepository: mocks.allergenRepository,
}));

vi.mock('@src/repositories/dietaryMarker/repository', () => ({
  dietaryMarkerRepository: mocks.dietaryMarkerRepository,
}));

vi.mock('@src/repositories/cart/repository', () => ({
  cartRepository: mocks.cartRepository,
}));

vi.mock('@src/repositories/order/repository', () => ({
  orderRepository: mocks.orderRepository,
}));

vi.mock('@src/repositories/counter/repository', () => ({
  counterRepository: mocks.counterRepository,
}));

const app = createApp();

const STORE_ID = 'store-1';

function alwaysOpenHours() {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    isOpen: true,
  }));
}

function alwaysClosedHours() {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    isOpen: false,
  }));
}

function seedStore(overrides: Partial<TestStore> = {}) {
  const now = new Date();
  const store: TestStore = {
    id: STORE_ID,
    organizationId: 'org-1',
    profile: { displayName: { en: 'Test Store' } },
    locale: { defaultLocale: 'en', supportedLocales: ['en'] },
    operation: {
      businessHours: alwaysOpenHours(),
      serviceFeeRate: 0.1,
      orderModes: [
        { type: 'dine_in', isEnabled: true, checkoutMode: 'pay_later' },
        { type: 'takeaway', isEnabled: true, checkoutMode: 'pay_first' },
      ],
    },
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  mocks.stores.set(store.id, store);
  return store;
}

function seedProduct(overrides: Partial<TestProduct> = {}) {
  const now = new Date();
  const product: TestProduct = {
    id: mocks.nextId('product'),
    organizationId: 'org-1',
    storeId: STORE_ID,
    categoryIds: [],
    name: { en: 'Beef Curry Rice' },
    imageUrls: [],
    price: 180,
    tagIds: [],
    allergenIds: [],
    dietaryMarkerIds: [],
    modifierIds: [],
    status: 'published',
    isActive: true,
    isSoldOut: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  mocks.products.set(product.id, product);
  return product;
}

function seedModifier(overrides: Partial<TestModifier> = {}) {
  const now = new Date();
  const modifier: TestModifier = {
    id: mocks.nextId('modifier'),
    storeId: STORE_ID,
    name: { en: 'Spice Level' },
    selectionType: 'single_choice',
    minSelect: 1,
    maxSelect: 1,
    options: [
      {
        id: 'option-mild',
        name: { en: 'Mild' },
        priceAdjustment: 0,
        isDefault: true,
        isActive: true,
        isSoldOut: false,
      },
      {
        id: 'option-extra',
        name: { en: 'Extra Hot' },
        priceAdjustment: 20,
        isDefault: false,
        isActive: true,
        isSoldOut: false,
      },
    ],
    inheritCategoryAvailability: false,
    availabilityRules: [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  mocks.modifiers.push(modifier);
  return modifier;
}

async function createDineInCart(displayName = 'Amy') {
  const response = await request(app)
    .post(`/api/v1/public/stores/${STORE_ID}/carts`)
    .send({
      orderType: 'dine_in',
      tableNumber: 'T1',
      avatarKey: 'rainbow_cat',
      displayName,
    });

  expect(response.status).toBe(201);
  return response.body.data as {
    cart: {
      id: string;
      joinCode?: string;
      expiresAt: string;
      orderingClosesAt?: string;
    };
    participantId: string;
    guestToken: string;
  };
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

beforeEach(() => {
  mocks.reset();
  seedStore();
});

describe('public store and menu', () => {
  it('returns guest-facing store info without merchant fields', async () => {
    const response = await request(app).get(
      `/api/v1/public/stores/${STORE_ID}`,
    );

    expect(response.status).toBe(200);
    const store = response.body.data.store;
    expect(store.id).toBe(STORE_ID);
    expect(store.orderModes).toEqual([
      { type: 'dine_in', checkoutMode: 'pay_later' },
      { type: 'takeaway', checkoutMode: 'pay_first' },
    ]);
    expect(store.organizationId).toBeUndefined();
    expect(store.status).toBeUndefined();
  });

  it('returns 404 for a disabled store', async () => {
    seedStore({ status: 'disabled' });

    const response = await request(app).get(
      `/api/v1/public/stores/${STORE_ID}`,
    );

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('STORE_NOT_FOUND');
  });

  it('only exposes published active products and referenced modifiers', async () => {
    const modifier = seedModifier();
    seedModifier({ id: 'modifier-unreferenced', name: { en: 'Unused' } });
    seedProduct({ modifierIds: [modifier.id] });
    seedProduct({ status: 'draft' });
    seedProduct({ isActive: false });

    const response = await request(app).get(
      `/api/v1/public/stores/${STORE_ID}/menu`,
    );

    expect(response.status).toBe(200);
    const menu = response.body.data.menu;
    expect(menu.products).toHaveLength(1);
    expect(menu.products[0].status).toBeUndefined();
    expect(menu.products[0].isActive).toBeUndefined();
    expect(menu.modifiers).toHaveLength(1);
    expect(menu.modifiers[0].id).toBe(modifier.id);
  });
});

describe('cart lifecycle', () => {
  it('requires a supported avatar when creating a cart', async () => {
    const missing = await request(app)
      .post(`/api/v1/public/stores/${STORE_ID}/carts`)
      .send({ orderType: 'dine_in' });
    const invalid = await request(app)
      .post(`/api/v1/public/stores/${STORE_ID}/carts`)
      .send({ orderType: 'dine_in', avatarKey: 'dragon' });

    expect(missing.status).toBe(400);
    expect(missing.body.code).toBe('VALIDATION_ERROR');
    expect(invalid.status).toBe(400);
    expect(invalid.body.code).toBe('VALIDATION_ERROR');
  });

  it('creates a dine-in pay-later cart with a join code and guest token', async () => {
    const { cart, participantId, guestToken } = await createDineInCart();

    expect(cart.joinCode).toBeDefined();
    expect(participantId).toMatch(/^participant-/);
    expect(guestToken).toBeTruthy();

    const session = await request(app)
      .get('/api/v1/public/guest/session')
      .set(auth(guestToken));

    expect(session.status).toBe(200);
    expect(session.body.data.session.cart.id).toBe(cart.id);
    expect(session.body.data.session.joinCode).toBe(cart.joinCode);
    expect(session.body.data.session.cart.participants[0]).toMatchObject({
      avatarKey: 'rainbow_cat',
      displayName: 'Amy',
    });
    expect(new Date(cart.expiresAt).getTime() - Date.now()).toBeGreaterThan(
      11 * 60 * 60 * 1000,
    );
  });

  it('snapshots the configured guest ordering deadline at cart creation', async () => {
    seedStore({
      operation: {
        businessHours: alwaysOpenHours(),
        serviceFeeRate: 0,
        orderModes: [
          { type: 'dine_in', isEnabled: true, checkoutMode: 'pay_later' },
        ],
        guestOrderingDurationMinutes: 30,
      },
    });

    const { cart } = await createDineInCart();

    expect(cart.orderingClosesAt).toBeDefined();
    expect(
      new Date(cart.orderingClosesAt!).getTime() -
        (new Date(cart.expiresAt).getTime() - 12 * 60 * 60 * 1000),
    ).toBe(30 * 60 * 1000);
  });

  it('rejects session restore and cart operations after fixed expiry', async () => {
    const product = seedProduct();
    const owner = await createDineInCart();
    mocks.carts.get(owner.cart.id)!.expiresAt = new Date(Date.now() - 1);

    const session = await request(app)
      .get('/api/v1/public/guest/session')
      .set(auth(owner.guestToken));
    const read = await request(app)
      .get('/api/v1/public/guest/cart')
      .set(auth(owner.guestToken));
    const addItem = await request(app)
      .post('/api/v1/public/guest/cart/items')
      .set(auth(owner.guestToken))
      .send({ productId: product.id, quantity: 1 });
    const leave = await request(app)
      .post('/api/v1/public/guest/cart/leave')
      .set(auth(owner.guestToken));
    const submit = await request(app)
      .post('/api/v1/public/guest/cart/submit')
      .set(auth(owner.guestToken))
      .send({});

    expect(session.status).toBe(409);
    expect(session.body.code).toBe('CART_NOT_ACTIVE');
    expect(read.status).toBe(409);
    expect(read.body.code).toBe('CART_NOT_ACTIVE');
    expect(addItem.status).toBe(409);
    expect(addItem.body.code).toBe('CART_NOT_ACTIVE');
    expect(leave.status).toBe(409);
    expect(leave.body.code).toBe('CART_NOT_ACTIVE');
    expect(submit.status).toBe(409);
    expect(submit.body.code).toBe('CART_NOT_ACTIVE');
  });

  it('rejects a disabled order type', async () => {
    seedStore({
      operation: {
        businessHours: alwaysOpenHours(),
        serviceFeeRate: 0,
        orderModes: [
          { type: 'dine_in', isEnabled: true, checkoutMode: 'pay_later' },
        ],
      },
    });

    const response = await request(app)
      .post(`/api/v1/public/stores/${STORE_ID}/carts`)
      .send({ orderType: 'takeaway', avatarKey: 'rainbow_cat' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('ORDER_TYPE_NOT_ENABLED');
  });

  it('rejects ordering while the store is closed', async () => {
    seedStore({
      operation: {
        businessHours: alwaysClosedHours(),
        serviceFeeRate: 0,
        orderModes: [
          { type: 'dine_in', isEnabled: true, checkoutMode: 'pay_later' },
        ],
      },
    });

    const response = await request(app)
      .post(`/api/v1/public/stores/${STORE_ID}/carts`)
      .send({ orderType: 'dine_in', avatarKey: 'rainbow_cat' });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('STORE_NOT_OPEN');
  });

  it('adds an item with modifier selection and computes totals', async () => {
    const modifier = seedModifier();
    const product = seedProduct({ modifierIds: [modifier.id] });
    const { guestToken } = await createDineInCart();

    const response = await request(app)
      .post('/api/v1/public/guest/cart/items')
      .set(auth(guestToken))
      .send({
        productId: product.id,
        quantity: 2,
        selectedOptions: [
          { modifierId: modifier.id, optionId: 'option-extra' },
        ],
      });

    expect(response.status).toBe(200);
    const cart = response.body.data.cart;
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].unitPrice).toBe(200);
    expect(cart.items[0].totalItemPrice).toBe(400);
    expect(cart.subtotal).toBe(400);
    expect(cart.serviceFeeAmount).toBe(40);
    expect(cart.totalAmount).toBe(440);
  });

  it('rejects a missing required modifier selection', async () => {
    const modifier = seedModifier();
    const product = seedProduct({ modifierIds: [modifier.id] });
    const { guestToken } = await createDineInCart();

    const response = await request(app)
      .post('/api/v1/public/guest/cart/items')
      .set(auth(guestToken))
      .send({ productId: product.id, quantity: 1 });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('MODIFIER_SELECTION_INVALID');
  });

  it('rejects adding a sold-out product', async () => {
    const product = seedProduct({ isSoldOut: true });
    const { guestToken } = await createDineInCart();

    const response = await request(app)
      .post('/api/v1/public/guest/cart/items')
      .set(auth(guestToken))
      .send({ productId: product.id, quantity: 1 });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('PRODUCT_SOLD_OUT');
  });
});

describe('group ordering', () => {
  it('lets a second participant join and protects item ownership', async () => {
    const product = seedProduct();
    const owner = await createDineInCart('Amy');

    const itemResponse = await request(app)
      .post('/api/v1/public/guest/cart/items')
      .set(auth(owner.guestToken))
      .send({ productId: product.id, quantity: 1 });
    const itemId = itemResponse.body.data.cart.items[0].id;

    const joinResponse = await request(app)
      .post(`/api/v1/public/stores/${STORE_ID}/carts/join`)
      .send({
        joinCode: owner.cart.joinCode,
        avatarKey: 'dog',
        displayName: 'Ben',
      });

    expect(joinResponse.status).toBe(200);
    const joiner = joinResponse.body.data as {
      session: { participantId: string; cart: { participants: unknown[] } };
      guestToken: string;
    };
    expect(joiner.session.cart.participants).toHaveLength(2);

    const forbidden = await request(app)
      .patch(`/api/v1/public/guest/cart/items/${itemId}`)
      .set(auth(joiner.guestToken))
      .send({ quantity: 5 });

    expect(forbidden.status).toBe(403);
    expect(forbidden.body.code).toBe('NOT_ITEM_OWNER');
  });

  it('rejects an unknown join code', async () => {
    const response = await request(app)
      .post(`/api/v1/public/stores/${STORE_ID}/carts/join`)
      .send({ joinCode: 'NOPE123456', avatarKey: 'dog' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_JOIN_CODE');
  });

  it('rejects joining an active cart after its ordering deadline', async () => {
    const owner = await createDineInCart();
    mocks.carts.get(owner.cart.id)!.orderingClosesAt = new Date(Date.now() - 1);

    const response = await request(app)
      .post(`/api/v1/public/stores/${STORE_ID}/carts/join`)
      .send({ joinCode: owner.cart.joinCode, avatarKey: 'dog' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_JOIN_CODE');
  });

  it('allows dine-in pay-first joining only before checkout', async () => {
    seedStore({
      operation: {
        businessHours: alwaysOpenHours(),
        serviceFeeRate: 0,
        orderModes: [
          { type: 'dine_in', isEnabled: true, checkoutMode: 'pay_first' },
        ],
      },
    });
    const product = seedProduct();
    const owner = await createDineInCart();

    const beforeCheckout = await request(app)
      .post(`/api/v1/public/stores/${STORE_ID}/carts/join`)
      .send({ joinCode: owner.cart.joinCode, avatarKey: 'dog' });
    expect(beforeCheckout.status).toBe(200);

    await request(app)
      .post('/api/v1/public/guest/cart/items')
      .set(auth(owner.guestToken))
      .send({ productId: product.id, quantity: 1 });
    await request(app)
      .post('/api/v1/public/guest/cart/submit')
      .set(auth(owner.guestToken))
      .send({});

    const afterCheckout = await request(app)
      .post(`/api/v1/public/stores/${STORE_ID}/carts/join`)
      .send({ joinCode: owner.cart.joinCode, avatarKey: 'owl' });
    expect(afterCheckout.status).toBe(400);
    expect(afterCheckout.body.code).toBe('INVALID_JOIN_CODE');
  });

  it('removes a leaving participant with their items and abandons an empty cart', async () => {
    const product = seedProduct();
    const owner = await createDineInCart('Amy');

    await request(app)
      .post('/api/v1/public/guest/cart/items')
      .set(auth(owner.guestToken))
      .send({ productId: product.id, quantity: 1 });

    const leaveResponse = await request(app)
      .post('/api/v1/public/guest/cart/leave')
      .set(auth(owner.guestToken));

    expect(leaveResponse.status).toBe(200);

    const cart = mocks.carts.get(owner.cart.id);
    expect(cart?.status).toBe('abandoned');
    expect(cart?.items).toHaveLength(0);

    const afterLeave = await request(app)
      .get('/api/v1/public/guest/cart')
      .set(auth(owner.guestToken));

    expect(afterLeave.status).toBe(409);
    expect(afterLeave.body.code).toBe('CART_NOT_ACTIVE');
  });
});

describe('submit and order', () => {
  async function submitOrder() {
    const product = seedProduct();
    const owner = await createDineInCart('Amy');

    await request(app)
      .post('/api/v1/public/guest/cart/items')
      .set(auth(owner.guestToken))
      .send({ productId: product.id, quantity: 2 });

    const submitResponse = await request(app)
      .post('/api/v1/public/guest/cart/submit')
      .set(auth(owner.guestToken))
      .send({});

    return { owner, product, submitResponse };
  }

  it('creates an order with the first batch and flips the cart', async () => {
    const { owner, submitResponse } = await submitOrder();

    expect(submitResponse.status).toBe(201);
    const order = submitResponse.body.data.order;
    expect(order.displayNumber).toBe('001');
    expect(order.status).toBe('pending_confirmation');
    expect(order.paymentStatus).toBe('unpaid');
    expect(order.batches).toHaveLength(1);
    expect(order.batches[0].batchNumber).toBe(1);

    const session = await request(app)
      .get('/api/v1/public/guest/session')
      .set(auth(owner.guestToken));

    expect(session.body.data.session.order.id).toBe(order.id);
    expect(session.body.data.session.cart).toBeUndefined();
  });

  it('lets a participant read their order while the shared cart is still active', async () => {
    const { owner, submitResponse } = await submitOrder();
    const orderId = submitResponse.body.data.order.id as string;

    // Simulate the multi-participant timing where the shared cart is still
    // `active` for a co-participant: order access must no longer gate on the
    // cart being `checked_out`.
    mocks.carts.get(owner.cart.id)!.status = 'active';

    const order = await request(app)
      .get('/api/v1/public/guest/order')
      .set(auth(owner.guestToken));

    expect(order.status).toBe(200);
    expect(order.body.data.order.id).toBe(orderId);
  });

  it('returns the order session branch regardless of cart status', async () => {
    const { owner, submitResponse } = await submitOrder();
    const orderId = submitResponse.body.data.order.id as string;

    mocks.carts.get(owner.cart.id)!.status = 'active';

    const session = await request(app)
      .get('/api/v1/public/guest/session')
      .set(auth(owner.guestToken));

    expect(session.status).toBe(200);
    expect(session.body.data.session.order.id).toBe(orderId);
    expect(session.body.data.session.cart).toBeUndefined();
  });

  it('rejects an order read for a token whose participant is not in any order', async () => {
    await submitOrder();

    // A separate cart in the same store: its participant is in no order yet.
    const outsider = await createDineInCart('Cara');

    const order = await request(app)
      .get('/api/v1/public/guest/order')
      .set(auth(outsider.guestToken));

    expect(order.status).toBe(404);
    expect(order.body.code).toBe('ORDER_NOT_FOUND');
  });

  it('rejects submit when an item went sold out and reports the items', async () => {
    const product = seedProduct();
    const owner = await createDineInCart('Amy');

    await request(app)
      .post('/api/v1/public/guest/cart/items')
      .set(auth(owner.guestToken))
      .send({ productId: product.id, quantity: 1 });

    mocks.products.get(product.id)!.isSoldOut = true;

    const response = await request(app)
      .post('/api/v1/public/guest/cart/submit')
      .set(auth(owner.guestToken))
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('PRODUCT_SOLD_OUT');
    expect(response.body.details.unavailableItems).toHaveLength(1);
    expect(response.body.details.unavailableItems[0].reason).toBe(
      'product_sold_out',
    );
  });

  it('appends an add-on batch while the pay-later order is unpaid', async () => {
    const { owner, product, submitResponse } = await submitOrder();
    expect(submitResponse.status).toBe(201);

    const addOn = await request(app)
      .post('/api/v1/public/guest/order/batches')
      .set(auth(owner.guestToken))
      .send({ items: [{ productId: product.id, quantity: 1 }] });

    expect(addOn.status).toBe(201);
    const order = addOn.body.data.order;
    expect(order.batches).toHaveLength(2);
    expect(order.batches[1].batchNumber).toBe(2);
    expect(order.status).toBe('pending_confirmation');
    expect(order.items).toHaveLength(2);
  });

  it('locks guest add-ons after payment', async () => {
    const { owner, product, submitResponse } = await submitOrder();
    const orderId = submitResponse.body.data.order.id as string;

    mocks.orders.get(orderId)!.paymentStatus = 'paid';

    const addOn = await request(app)
      .post('/api/v1/public/guest/order/batches')
      .set(auth(owner.guestToken))
      .send({ items: [{ productId: product.id, quantity: 1 }] });

    expect(addOn.status).toBe(409);
    expect(addOn.body.code).toBe('ORDER_LOCKED');
  });

  it('routes the join code to the open order after checkout', async () => {
    const { owner, submitResponse } = await submitOrder();
    expect(submitResponse.status).toBe(201);

    const joinResponse = await request(app)
      .post(`/api/v1/public/stores/${STORE_ID}/carts/join`)
      .send({
        joinCode: owner.cart.joinCode,
        avatarKey: 'dog',
        displayName: 'Ben',
      });

    expect(joinResponse.status).toBe(200);
    const session = joinResponse.body.data.session;
    expect(session.order.id).toBe(submitResponse.body.data.order.id);
    expect(session.cart).toBeUndefined();
    expect(session.order.participants).toHaveLength(2);
    expect(session.joinCode).toBe(owner.cart.joinCode);
  });

  it('copies the cart fallback deadline and locks post-checkout group ordering after it', async () => {
    const { owner, product, submitResponse } = await submitOrder();
    const order = submitResponse.body.data.order;

    expect(order.orderingClosesAt).toBe(owner.cart.expiresAt);
    mocks.orders.get(order.id)!.orderingClosesAt = new Date(Date.now() - 1);

    const session = await request(app)
      .get('/api/v1/public/guest/session')
      .set(auth(owner.guestToken));
    const join = await request(app)
      .post(`/api/v1/public/stores/${STORE_ID}/carts/join`)
      .send({ joinCode: owner.cart.joinCode, avatarKey: 'owl' });
    const addOn = await request(app)
      .post('/api/v1/public/guest/order/batches')
      .set(auth(owner.guestToken))
      .send({ items: [{ productId: product.id, quantity: 1 }] });

    expect(session.status).toBe(200);
    expect(session.body.data.session.joinCode).toBeUndefined();
    expect(join.status).toBe(400);
    expect(join.body.code).toBe('INVALID_JOIN_CODE');
    expect(addOn.status).toBe(409);
    expect(addOn.body.code).toBe('ORDER_LOCKED');
  });
});
