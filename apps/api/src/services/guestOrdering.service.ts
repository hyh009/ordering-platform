import { randomInt, randomUUID } from 'node:crypto';

import { toCartDto } from '@src/models/cart/mapper';
import { toOrderDto } from '@src/models/order/mapper';
import {
  getBusinessDate,
  isStoreOpenAt,
} from '@src/models/store/businessHours';
import { cartRepository } from '@src/repositories/cart/repository';
import { counterRepository } from '@src/repositories/counter/repository';
import { orderRepository } from '@src/repositories/order/repository';
import { productRepository } from '@src/repositories/product/repository';
import { productModifierRepository } from '@src/repositories/productModifier/repository';
import { signGuestToken } from '@src/services/guestToken.service';
import {
  emitOrderUpdated,
  subscribeToOrderUpdates,
} from '@src/services/orderEvents.service';
import { getActivePublicStore } from '@src/services/publicStore.service';
import { ERROR_CODES } from '@src/utils/errorCode';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '@src/utils/errors';

import type {
  CartDto,
  CartItemInput,
  CreateCartRequest,
  GuestSessionDto,
  JoinCartRequest,
  OrderDto,
  OrderStreamEventDto,
  SubmitCartRequest,
  UpdateCartItemRequest,
} from '@repo/shared';
import type {
  CartEntity,
  CartItemSnapshot,
  OrderingParticipantSnapshot,
  SelectedModifierOptionSnapshot,
} from '@src/models/cart/model';
import type { OrderEntity } from '@src/models/order/model';
import type { ProductModifierEntity } from '@src/models/productModifier/model';
import type { StoreEntity } from '@src/models/store/model';
import type { UpdateCartInput } from '@src/repositories/cart/repository';
import type { UpdateOrderInput } from '@src/repositories/order/repository';
import type { GuestTokenClaims } from '@src/services/guestToken.service';

const OPTIMISTIC_WRITE_ATTEMPTS = 3;
const JOIN_CODE_CREATE_ATTEMPTS = 3;
const JOIN_CODE_LENGTH = 10;
const CART_LIFETIME_MS = 12 * 60 * 60 * 1000;
// Excludes ambiguous characters (0/O, 1/I/L) for QR fallback readability.
const JOIN_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateJoinCode(): string {
  let code = '';
  for (let i = 0; i < JOIN_CODE_LENGTH; i += 1) {
    code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
  }
  return code;
}

function buildParticipant(
  avatarKey: CreateCartRequest['avatarKey'],
  displayName: string | undefined,
  joinedAt: Date,
): OrderingParticipantSnapshot {
  return {
    id: `participant-${randomUUID()}`,
    avatarKey,
    ...(displayName !== undefined ? { displayName } : {}),
    joinedAt,
  };
}

function invalidGuestTokenError(): UnauthorizedError {
  return new UnauthorizedError(
    'Invalid guest token',
    ERROR_CODES.INVALID_GUEST_TOKEN,
  );
}

function invalidJoinCodeError(): BadRequestError {
  return new BadRequestError(
    'Invalid or expired join code',
    ERROR_CODES.INVALID_JOIN_CODE,
  );
}

function requireStoreOpen(store: StoreEntity, requestTime: Date): void {
  if (!isStoreOpenAt(store.operation.businessHours, requestTime)) {
    throw new ConflictError(
      'Store is not open for ordering',
      ERROR_CODES.STORE_NOT_OPEN,
    );
  }
}

function findParticipant(
  participants: OrderingParticipantSnapshot[],
  participantId: string,
): OrderingParticipantSnapshot | undefined {
  return participants.find((participant) => participant.id === participantId);
}

function computeTotals(items: CartItemSnapshot[], serviceFeeRate: number) {
  const subtotal = items.reduce((sum, item) => sum + item.totalItemPrice, 0);
  const serviceFeeAmount = Math.round(subtotal * serviceFeeRate);
  return {
    subtotal,
    serviceFeeAmount,
    totalAmount: subtotal + serviceFeeAmount,
  };
}

function isBeforeDeadline(deadline: Date, requestTime: Date): boolean {
  return requestTime.getTime() < deadline.getTime();
}

function isActiveCartUsable(cart: CartEntity, requestTime: Date): boolean {
  return (
    cart.status === 'active' &&
    isBeforeDeadline(cart.expiresAt, requestTime) &&
    (cart.orderingClosesAt === undefined ||
      isBeforeDeadline(cart.orderingClosesAt, requestTime))
  );
}

function canGuestExtendOrder(order: OrderEntity, requestTime: Date): boolean {
  return (
    order.orderType === 'dine_in' &&
    order.checkoutMode === 'pay_later' &&
    order.paymentStatus === 'unpaid' &&
    order.status !== 'completed' &&
    order.status !== 'cancelled' &&
    isBeforeDeadline(order.orderingClosesAt, requestTime)
  );
}

export function isGuestJoinCodeUsable(
  cart: CartEntity,
  order: OrderEntity | undefined,
  requestTime: Date,
): boolean {
  if (cart.joinCode === undefined || cart.orderType !== 'dine_in') {
    return false;
  }
  if (cart.status === 'active') {
    return isActiveCartUsable(cart, requestTime);
  }
  return (
    cart.status === 'checked_out' &&
    order !== undefined &&
    canGuestExtendOrder(order, requestTime)
  );
}

function assertActiveCartUsable(cart: CartEntity, requestTime: Date): void {
  if (!isActiveCartUsable(cart, requestTime)) {
    throw new ConflictError(
      'Cart is no longer active',
      ERROR_CODES.CART_NOT_ACTIVE,
    );
  }
}

async function loadCartForClaims(
  claims: GuestTokenClaims,
): Promise<CartEntity> {
  const cart = await cartRepository.findById(claims.cartId);
  if (!cart || cart.storeId !== claims.storeId) {
    throw invalidGuestTokenError();
  }
  return cart;
}

async function updateCartWithRetry(
  cartId: string,
  mutate: (cart: CartEntity) => Promise<UpdateCartInput> | UpdateCartInput,
): Promise<CartEntity> {
  for (let attempt = 0; attempt < OPTIMISTIC_WRITE_ATTEMPTS; attempt += 1) {
    const cart = await cartRepository.findById(cartId);
    if (!cart) {
      throw new NotFoundError('Cart not found', ERROR_CODES.CART_NOT_FOUND);
    }

    const input = await mutate(cart);
    const updated = await cartRepository.update(cartId, input, {
      expectedUpdatedAt: cart.updatedAt,
    });

    if (updated) {
      return updated;
    }
  }

  throw new ConflictError(
    'Cart was modified concurrently, please retry',
    ERROR_CODES.CONFLICT,
  );
}

async function updateOrderWithRetry(
  orderId: string,
  mutate: (order: OrderEntity) => Promise<UpdateOrderInput> | UpdateOrderInput,
): Promise<OrderEntity> {
  for (let attempt = 0; attempt < OPTIMISTIC_WRITE_ATTEMPTS; attempt += 1) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found', ERROR_CODES.ORDER_NOT_FOUND);
    }

    const input = await mutate(order);
    const updated = await orderRepository.update(orderId, input, {
      expectedUpdatedAt: order.updatedAt,
    });

    if (updated) {
      return updated;
    }
  }

  throw new ConflictError(
    'Order was modified concurrently, please retry',
    ERROR_CODES.CONFLICT,
  );
}

// ── Item snapshot building / validation ────────────────────────────────────────

type ItemValidationContext = {
  storeId: string;
};

async function loadProductModifiers(
  storeId: string,
  modifierIds: string[],
): Promise<ProductModifierEntity[]> {
  if (modifierIds.length === 0) {
    return [];
  }

  const modifiers = await productModifierRepository.listByStore({
    storeId,
    isActive: true,
  });

  const ids = new Set(modifierIds);
  return modifiers.filter((modifier) => ids.has(modifier.id));
}

function buildSelectedOptionSnapshots(
  modifiers: ProductModifierEntity[],
  selectedOptions: CartItemInput['selectedOptions'],
): SelectedModifierOptionSnapshot[] {
  const selections = selectedOptions ?? [];
  const modifierById = new Map(
    modifiers.map((modifier) => [modifier.id, modifier]),
  );

  const invalidSelection = (reason: string, details?: unknown) =>
    new BadRequestError(
      reason,
      ERROR_CODES.MODIFIER_SELECTION_INVALID,
      details,
    );

  const snapshots: SelectedModifierOptionSnapshot[] = [];
  const countByModifier = new Map<string, number>();

  for (const selection of selections) {
    const modifier = modifierById.get(selection.modifierId);
    if (!modifier) {
      throw invalidSelection('Unknown modifier for this product', {
        modifierId: selection.modifierId,
      });
    }

    const option = modifier.options.find(
      (candidate) => candidate.id === selection.optionId,
    );
    if (!option || !option.isActive) {
      throw invalidSelection('Unknown modifier option', {
        modifierId: selection.modifierId,
        optionId: selection.optionId,
      });
    }

    if (option.isSoldOut) {
      throw invalidSelection('Modifier option is sold out', {
        modifierId: selection.modifierId,
        optionId: selection.optionId,
        reason: 'option_sold_out',
      });
    }

    countByModifier.set(
      selection.modifierId,
      (countByModifier.get(selection.modifierId) ?? 0) + 1,
    );

    snapshots.push({
      modifierId: modifier.id,
      modifierName: modifier.name,
      optionId: option.id,
      optionName: option.name,
      priceAdjustment: option.priceAdjustment,
    });
  }

  for (const modifier of modifiers) {
    const count = countByModifier.get(modifier.id) ?? 0;
    if (count < modifier.minSelect || count > modifier.maxSelect) {
      throw invalidSelection('Modifier selection count is out of bounds', {
        modifierId: modifier.id,
        minSelect: modifier.minSelect,
        maxSelect: modifier.maxSelect,
        selected: count,
      });
    }
  }

  return snapshots;
}

async function buildCartItemSnapshot(
  context: ItemValidationContext,
  input: CartItemInput,
  participant: OrderingParticipantSnapshot,
): Promise<CartItemSnapshot> {
  const product = await productRepository.findById(input.productId);

  if (
    !product ||
    product.storeId !== context.storeId ||
    product.status !== 'published' ||
    !product.isActive
  ) {
    throw new NotFoundError('Product not found', ERROR_CODES.PRODUCT_NOT_FOUND);
  }

  if (product.isSoldOut) {
    throw new ConflictError(
      'Product is sold out',
      ERROR_CODES.PRODUCT_SOLD_OUT,
    );
  }

  const modifiers = await loadProductModifiers(
    context.storeId,
    product.modifierIds,
  );
  const selectedOptions = buildSelectedOptionSnapshots(
    modifiers,
    input.selectedOptions,
  );

  // unitPrice includes selected option adjustments; totalItemPrice = unitPrice * quantity.
  const unitPrice =
    product.price +
    selectedOptions.reduce((sum, option) => sum + option.priceAdjustment, 0);

  return {
    id: `cart-item-${randomUUID()}`,
    productId: product.id,
    productName: product.name,
    quantity: input.quantity,
    unitPrice,
    selectedOptions,
    addedByParticipantId: participant.id,
    ...(participant.displayName !== undefined
      ? { participantDisplayName: participant.displayName }
      : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    totalItemPrice: unitPrice * input.quantity,
    createdAt: new Date(),
  };
}

type UnavailableItem = {
  itemId: string;
  productId: string;
  reason: 'product_unavailable' | 'product_sold_out' | 'option_unavailable';
};

async function findUnavailableItems(
  storeId: string,
  items: CartItemSnapshot[],
): Promise<UnavailableItem[]> {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = await Promise.all(
    productIds.map((productId) => productRepository.findById(productId)),
  );
  const productById = new Map(
    products
      .filter((product) => product !== null)
      .map((product) => [product.id, product]),
  );

  const modifiers = await productModifierRepository.listByStore({
    storeId,
    isActive: true,
  });
  const modifierById = new Map(
    modifiers.map((modifier) => [modifier.id, modifier]),
  );

  const unavailable: UnavailableItem[] = [];

  for (const item of items) {
    const product = productById.get(item.productId);

    if (!product || product.status !== 'published' || !product.isActive) {
      unavailable.push({
        itemId: item.id,
        productId: item.productId,
        reason: 'product_unavailable',
      });
      continue;
    }

    if (product.isSoldOut) {
      unavailable.push({
        itemId: item.id,
        productId: item.productId,
        reason: 'product_sold_out',
      });
      continue;
    }

    const hasUnavailableOption = item.selectedOptions.some((selection) => {
      const modifier = modifierById.get(selection.modifierId);
      const option = modifier?.options.find(
        (candidate) => candidate.id === selection.optionId,
      );
      return !option || !option.isActive || option.isSoldOut;
    });

    if (hasUnavailableOption) {
      unavailable.push({
        itemId: item.id,
        productId: item.productId,
        reason: 'option_unavailable',
      });
    }
  }

  return unavailable;
}

// ── Cart lifecycle ─────────────────────────────────────────────────────────────

export type CreateCartResult = {
  cart: CartDto;
  participantId: string;
  guestToken: string;
};

export async function createCart(
  storeId: string,
  request: CreateCartRequest,
): Promise<CreateCartResult> {
  const requestTime = new Date();
  const store = await getActivePublicStore(storeId);
  requireStoreOpen(store, requestTime);

  const orderMode = store.operation.orderModes.find(
    (mode) => mode.type === request.orderType && mode.isEnabled,
  );
  if (!orderMode) {
    throw new BadRequestError(
      'Order type is not enabled for this store',
      ERROR_CODES.ORDER_TYPE_NOT_ENABLED,
    );
  }

  const participant = buildParticipant(
    request.avatarKey,
    request.displayName,
    requestTime,
  );
  const needsJoinCode = request.orderType === 'dine_in';
  const expiresAt = new Date(requestTime.getTime() + CART_LIFETIME_MS);
  const orderingClosesAt =
    store.operation.guestOrderingDurationMinutes === undefined
      ? undefined
      : new Date(
          requestTime.getTime() +
            store.operation.guestOrderingDurationMinutes * 60 * 1000,
        );

  let cart: CartEntity | undefined;
  for (let attempt = 0; attempt < JOIN_CODE_CREATE_ATTEMPTS; attempt += 1) {
    try {
      cart = await cartRepository.create({
        organizationId: store.organizationId,
        storeId: store.id,
        orderType: request.orderType,
        checkoutMode: orderMode.checkoutMode,
        ...(needsJoinCode ? { joinCode: generateJoinCode() } : {}),
        ...(request.tableNumber !== undefined
          ? { tableNumber: request.tableNumber }
          : {}),
        participants: [participant],
        serviceFeeRate: store.operation.serviceFeeRate,
        expiresAt,
        ...(orderingClosesAt !== undefined ? { orderingClosesAt } : {}),
      });
      break;
    } catch (error) {
      const isDuplicateJoinCode =
        needsJoinCode &&
        typeof error === 'object' &&
        error !== null &&
        (error as { code?: number }).code === 11000;

      if (!isDuplicateJoinCode || attempt === JOIN_CODE_CREATE_ATTEMPTS - 1) {
        throw error;
      }
    }
  }

  if (!cart) {
    throw new Error('Failed to create cart');
  }

  return {
    cart: toCartDto(cart),
    participantId: participant.id,
    guestToken: signGuestToken({
      storeId: store.id,
      cartId: cart.id,
      participantId: participant.id,
    }),
  };
}

export type JoinCartResult = {
  session: GuestSessionDto;
  guestToken: string;
};

export async function joinCart(
  storeId: string,
  request: JoinCartRequest,
): Promise<JoinCartResult> {
  const requestTime = new Date();
  const cart = await cartRepository.findByJoinCode(request.joinCode);
  if (!cart || cart.storeId !== storeId || cart.status === 'abandoned') {
    throw invalidJoinCodeError();
  }

  const participant = buildParticipant(
    request.avatarKey,
    request.displayName,
    requestTime,
  );
  const guestToken = signGuestToken({
    storeId,
    cartId: cart.id,
    participantId: participant.id,
  });

  if (cart.status === 'active') {
    const updated = await updateCartWithRetry(cart.id, (fresh) => {
      if (!isGuestJoinCodeUsable(fresh, undefined, requestTime)) {
        throw invalidJoinCodeError();
      }
      return { participants: [...fresh.participants, participant] };
    });

    return {
      session: {
        participantId: participant.id,
        joinCode: updated.joinCode!,
        cart: toCartDto(updated),
      },
      guestToken,
    };
  }

  // checked_out: the join code routes to the open order until payment locks it.
  if (cart.orderId === undefined) {
    throw invalidJoinCodeError();
  }

  const order = await updateOrderWithRetry(cart.orderId, (fresh) => {
    if (!isGuestJoinCodeUsable(cart, fresh, requestTime)) {
      throw invalidJoinCodeError();
    }
    return { participants: [...fresh.participants, participant] };
  });

  emitOrderUpdated(order);

  return {
    session: {
      participantId: participant.id,
      joinCode: cart.joinCode!,
      order: toOrderDto(order),
    },
    guestToken,
  };
}

export async function getGuestSession(
  claims: GuestTokenClaims,
): Promise<GuestSessionDto> {
  const requestTime = new Date();
  const cart = await loadCartForClaims(claims);

  if (cart.status === 'checked_out' && cart.orderId !== undefined) {
    const order = await orderRepository.findById(cart.orderId);
    if (!order) {
      throw new NotFoundError('Order not found', ERROR_CODES.ORDER_NOT_FOUND);
    }

    if (!findParticipant(order.participants, claims.participantId)) {
      throw invalidGuestTokenError();
    }

    return {
      participantId: claims.participantId,
      ...(isGuestJoinCodeUsable(cart, order, requestTime)
        ? { joinCode: cart.joinCode }
        : {}),
      order: toOrderDto(order),
    };
  }

  assertActiveCartUsable(cart, requestTime);
  if (!findParticipant(cart.participants, claims.participantId)) {
    throw invalidGuestTokenError();
  }

  return {
    participantId: claims.participantId,
    ...(isGuestJoinCodeUsable(cart, undefined, requestTime)
      ? { joinCode: cart.joinCode }
      : {}),
    cart: toCartDto(cart),
  };
}

export async function getGuestCart(claims: GuestTokenClaims): Promise<CartDto> {
  const requestTime = new Date();
  const cart = await loadCartForClaims(claims);

  assertActiveCartUsable(cart, requestTime);
  if (!findParticipant(cart.participants, claims.participantId)) {
    throw invalidGuestTokenError();
  }

  return toCartDto(cart);
}

function assertActiveCartMembership(
  cart: CartEntity,
  participantId: string,
  requestTime: Date,
): OrderingParticipantSnapshot {
  assertActiveCartUsable(cart, requestTime);

  const participant = findParticipant(cart.participants, participantId);
  if (!participant) {
    throw invalidGuestTokenError();
  }

  return participant;
}

export async function addCartItem(
  claims: GuestTokenClaims,
  request: CartItemInput,
): Promise<CartDto> {
  const requestTime = new Date();
  const store = await getActivePublicStore(claims.storeId);
  requireStoreOpen(store, requestTime);

  const updated = await updateCartWithRetry(claims.cartId, async (cart) => {
    const participant = assertActiveCartMembership(
      cart,
      claims.participantId,
      requestTime,
    );
    const item = await buildCartItemSnapshot(
      { storeId: cart.storeId },
      request,
      participant,
    );

    const items = [...cart.items, item];
    return { items, ...computeTotals(items, cart.serviceFeeRate) };
  });

  return toCartDto(updated);
}

export async function updateCartItem(
  claims: GuestTokenClaims,
  itemId: string,
  request: UpdateCartItemRequest,
): Promise<CartDto> {
  const requestTime = new Date();
  const updated = await updateCartWithRetry(claims.cartId, async (cart) => {
    const participant = assertActiveCartMembership(
      cart,
      claims.participantId,
      requestTime,
    );

    const existing = cart.items.find((item) => item.id === itemId);
    if (!existing) {
      throw new NotFoundError(
        'Cart item not found',
        ERROR_CODES.CART_ITEM_NOT_FOUND,
      );
    }

    if (existing.addedByParticipantId !== claims.participantId) {
      throw new ForbiddenError(
        'Only the participant who added an item can modify it',
        ERROR_CODES.NOT_ITEM_OWNER,
      );
    }

    const nextInput: CartItemInput = {
      productId: existing.productId,
      quantity: request.quantity ?? existing.quantity,
      selectedOptions:
        request.selectedOptions ??
        existing.selectedOptions.map((option) => ({
          modifierId: option.modifierId,
          optionId: option.optionId,
        })),
      ...(request.notes === null
        ? {}
        : request.notes !== undefined
          ? { notes: request.notes }
          : existing.notes !== undefined
            ? { notes: existing.notes }
            : {}),
    };

    const rebuilt = await buildCartItemSnapshot(
      { storeId: cart.storeId },
      nextInput,
      participant,
    );

    const nextItem: CartItemSnapshot = {
      ...rebuilt,
      id: existing.id,
      createdAt: existing.createdAt,
    };

    const items = cart.items.map((item) =>
      item.id === itemId ? nextItem : item,
    );
    return { items, ...computeTotals(items, cart.serviceFeeRate) };
  });

  return toCartDto(updated);
}

export async function removeCartItem(
  claims: GuestTokenClaims,
  itemId: string,
): Promise<CartDto> {
  const requestTime = new Date();
  const updated = await updateCartWithRetry(claims.cartId, (cart) => {
    assertActiveCartMembership(cart, claims.participantId, requestTime);

    const existing = cart.items.find((item) => item.id === itemId);
    if (!existing) {
      throw new NotFoundError(
        'Cart item not found',
        ERROR_CODES.CART_ITEM_NOT_FOUND,
      );
    }

    if (existing.addedByParticipantId !== claims.participantId) {
      throw new ForbiddenError(
        'Only the participant who added an item can modify it',
        ERROR_CODES.NOT_ITEM_OWNER,
      );
    }

    const items = cart.items.filter((item) => item.id !== itemId);
    return { items, ...computeTotals(items, cart.serviceFeeRate) };
  });

  return toCartDto(updated);
}

export async function leaveCart(claims: GuestTokenClaims): Promise<string> {
  const requestTime = new Date();
  const updated = await updateCartWithRetry(claims.cartId, (cart) => {
    assertActiveCartMembership(cart, claims.participantId, requestTime);

    const participants = cart.participants.filter(
      (participant) => participant.id !== claims.participantId,
    );
    const items = cart.items.filter(
      (item) => item.addedByParticipantId !== claims.participantId,
    );

    return {
      participants,
      items,
      ...computeTotals(items, cart.serviceFeeRate),
      ...(participants.length === 0 ? { status: 'abandoned' as const } : {}),
    };
  });

  return updated.id;
}

// ── Submit / order ─────────────────────────────────────────────────────────────

function buildBatch(input: {
  batchNumber: number;
  items: CartItemSnapshot[];
  submittedByParticipantId: string;
}) {
  return {
    id: `batch-${randomUUID()}`,
    batchNumber: input.batchNumber,
    status: 'pending_confirmation' as const,
    submittedAt: new Date(),
    submittedByParticipantId: input.submittedByParticipantId,
    items: input.items,
    subtotal: input.items.reduce((sum, item) => sum + item.totalItemPrice, 0),
  };
}

export async function submitCart(
  claims: GuestTokenClaims,
  request: SubmitCartRequest,
): Promise<OrderDto> {
  const requestTime = new Date();
  const store = await getActivePublicStore(claims.storeId);
  requireStoreOpen(store, requestTime);

  for (let attempt = 0; attempt < OPTIMISTIC_WRITE_ATTEMPTS; attempt += 1) {
    const cart = await cartRepository.findById(claims.cartId);
    if (!cart) {
      throw new NotFoundError('Cart not found', ERROR_CODES.CART_NOT_FOUND);
    }

    assertActiveCartMembership(cart, claims.participantId, requestTime);

    if (cart.items.length === 0) {
      throw new BadRequestError('Cart is empty', ERROR_CODES.BAD_REQUEST);
    }

    const unavailable = await findUnavailableItems(cart.storeId, cart.items);
    if (unavailable.length > 0) {
      throw new BadRequestError(
        'Some items are no longer available',
        ERROR_CODES.PRODUCT_SOLD_OUT,
        { unavailableItems: unavailable },
      );
    }

    // Flip the cart first so concurrent edits or double submits lose the race,
    // then create the order from the flipped cart state.
    const flipped = await cartRepository.update(
      cart.id,
      {
        status: 'checked_out',
        ...(request.notes !== undefined ? { notes: request.notes } : {}),
      },
      { expectedUpdatedAt: cart.updatedAt },
    );

    if (!flipped) {
      continue;
    }

    const businessDate = getBusinessDate(requestTime);
    const dailySequence = await counterRepository.nextDailyOrderSequence(
      cart.storeId,
      businessDate,
    );

    const order = await orderRepository.create({
      organizationId: flipped.organizationId,
      storeId: flipped.storeId,
      cartId: flipped.id,
      orderType: flipped.orderType,
      checkoutMode: flipped.checkoutMode,
      businessDate,
      dailySequence,
      displayNumber: String(dailySequence).padStart(3, '0'),
      status: 'pending_confirmation',
      paymentStatus: 'unpaid',
      ...(flipped.tableNumber !== undefined
        ? { tableNumber: flipped.tableNumber }
        : {}),
      participants: flipped.participants,
      items: flipped.items,
      batches: [
        buildBatch({
          batchNumber: 1,
          items: flipped.items,
          submittedByParticipantId: claims.participantId,
        }),
      ],
      ...(flipped.notes !== undefined ? { notes: flipped.notes } : {}),
      subtotal: flipped.subtotal,
      serviceFeeRate: flipped.serviceFeeRate,
      serviceFeeAmount: flipped.serviceFeeAmount,
      totalAmount: flipped.totalAmount,
      orderingClosesAt: flipped.orderingClosesAt ?? flipped.expiresAt,
    });

    await cartRepository.update(flipped.id, { orderId: order.id });

    emitOrderUpdated(order);
    return toOrderDto(order);
  }

  throw new ConflictError(
    'Cart was modified concurrently, please retry',
    ERROR_CODES.CONFLICT,
  );
}

async function loadOrderForClaims(
  claims: GuestTokenClaims,
): Promise<OrderEntity> {
  const cart = await loadCartForClaims(claims);

  if (cart.status !== 'checked_out' || cart.orderId === undefined) {
    throw new NotFoundError('Order not found', ERROR_CODES.ORDER_NOT_FOUND);
  }

  const order = await orderRepository.findById(cart.orderId);
  if (!order) {
    throw new NotFoundError('Order not found', ERROR_CODES.ORDER_NOT_FOUND);
  }

  if (!findParticipant(order.participants, claims.participantId)) {
    throw invalidGuestTokenError();
  }

  return order;
}

export async function getGuestOrder(
  claims: GuestTokenClaims,
): Promise<OrderDto> {
  const order = await loadOrderForClaims(claims);
  return toOrderDto(order);
}

export type GuestOrderSubscription = {
  initial: OrderStreamEventDto;
  unsubscribe: () => void;
};

export async function subscribeToGuestOrder(
  claims: GuestTokenClaims,
  listener: (event: OrderStreamEventDto) => void,
): Promise<GuestOrderSubscription> {
  const order = await loadOrderForClaims(claims);

  const unsubscribe = subscribeToOrderUpdates(order.id, (entity) => {
    listener({ type: 'order_updated', order: toOrderDto(entity) });
  });

  return {
    initial: { type: 'order_updated', order: toOrderDto(order) },
    unsubscribe,
  };
}

export async function addOrderBatch(
  claims: GuestTokenClaims,
  items: CartItemInput[],
): Promise<OrderDto> {
  const requestTime = new Date();
  const store = await getActivePublicStore(claims.storeId);
  requireStoreOpen(store, requestTime);

  // Validates membership and that the order exists before mutating.
  const existing = await loadOrderForClaims(claims);

  const updated = await updateOrderWithRetry(existing.id, async (order) => {
    if (!canGuestExtendOrder(order, requestTime)) {
      throw new ConflictError(
        'Order can no longer be extended by guests',
        ERROR_CODES.ORDER_LOCKED,
      );
    }

    const participant = findParticipant(
      order.participants,
      claims.participantId,
    );
    if (!participant) {
      throw invalidGuestTokenError();
    }

    const snapshots: CartItemSnapshot[] = [];
    for (const item of items) {
      snapshots.push(
        await buildCartItemSnapshot(
          { storeId: order.storeId },
          item,
          participant,
        ),
      );
    }

    const nextBatchNumber =
      order.batches.reduce(
        (max, batch) => Math.max(max, batch.batchNumber),
        0,
      ) + 1;

    const nextItems = [...order.items, ...snapshots];

    return {
      items: nextItems,
      batches: [
        ...order.batches,
        buildBatch({
          batchNumber: nextBatchNumber,
          items: snapshots,
          submittedByParticipantId: claims.participantId,
        }),
      ],
      // A new pending batch always needs staff confirmation again.
      status: 'pending_confirmation' as const,
      ...computeTotals(nextItems, order.serviceFeeRate),
    };
  });

  emitOrderUpdated(updated);
  return toOrderDto(updated);
}
