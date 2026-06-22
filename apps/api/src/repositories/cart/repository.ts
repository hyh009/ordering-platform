import { cartMongoRepository } from '@src/repositories/cart/mongo.repository';

import type {
  CartEntity,
  CartItemSnapshot,
  CartStatus,
  OrderingParticipantSnapshot,
} from '@src/models/cart/model';
import type {
  StoreCheckoutMode,
  StoreOrderType,
} from '@src/models/store/model';
import type { ClientSession } from 'mongoose';

export type CreateCartInput = {
  organizationId: string;
  storeId: string;
  orderType: StoreOrderType;
  checkoutMode: StoreCheckoutMode;
  joinCode?: string | undefined;
  tableNumber?: string | undefined;
  participants: OrderingParticipantSnapshot[];
  serviceFeeRate: number;
  expiresAt: Date;
  orderingClosesAt?: Date | undefined;
};

export type UpdateCartInput = {
  status?: CartStatus | undefined;
  participants?: OrderingParticipantSnapshot[] | undefined;
  items?: CartItemSnapshot[] | undefined;
  notes?: string | undefined;
  subtotal?: number | undefined;
  serviceFeeAmount?: number | undefined;
  totalAmount?: number | undefined;
  orderId?: string | undefined;
};

export type UpdateCartOptions = {
  expectedUpdatedAt?: Date | undefined;
  session?: ClientSession | undefined;
};

export type CartRepository = {
  create(input: CreateCartInput, session?: ClientSession): Promise<CartEntity>;
  findById(cartId: string, session?: ClientSession): Promise<CartEntity | null>;
  findByJoinCode(joinCode: string): Promise<CartEntity | null>;
  update(
    cartId: string,
    input: UpdateCartInput,
    options?: UpdateCartOptions,
  ): Promise<CartEntity | null>;
};

export const cartRepository: CartRepository = cartMongoRepository;
