import { orderModel } from '@/models/order';

import type { CartDto, GuestSessionDto } from '@repo/shared';
import type { Cart, GuestSession } from './types';

export const cartModel = {
  deserialize(dto: CartDto): Cart {
    const cart: Cart = {
      id: dto.id,
      storeId: dto.storeId,
      orderType: dto.orderType,
      checkoutMode: dto.checkoutMode,
      status: dto.status,
      participants: dto.participants,
      items: dto.items,
      subtotal: dto.subtotal,
      serviceFeeRate: dto.serviceFeeRate,
      serviceFeeAmount: dto.serviceFeeAmount,
      totalAmount: dto.totalAmount,
      expiresAt: dto.expiresAt,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };

    if (dto.joinCode !== undefined) cart.joinCode = dto.joinCode;
    if (dto.tableNumber !== undefined) cart.tableNumber = dto.tableNumber;
    if (dto.notes !== undefined) cart.notes = dto.notes;
    if (dto.orderId !== undefined) cart.orderId = dto.orderId;
    if (dto.orderingClosesAt !== undefined) {
      cart.orderingClosesAt = dto.orderingClosesAt;
    }

    return cart;
  },

  deserializeSession(dto: GuestSessionDto): GuestSession {
    const session: GuestSession = { participantId: dto.participantId };

    if (dto.joinCode !== undefined) {
      session.joinCode = dto.joinCode;
    }

    if (dto.cart !== undefined) {
      session.cart = cartModel.deserialize(dto.cart);
    }

    if (dto.order !== undefined) {
      session.order = orderModel.deserialize(dto.order);
    }

    return session;
  },
};
