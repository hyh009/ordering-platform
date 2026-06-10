import { randomUUID } from 'node:crypto';

import { CartMongoModel } from '@src/models/cart/mongo';

import type { CartEntity } from '@src/models/cart/model';
import type {
  CreateCartInput,
  UpdateCartInput,
  UpdateCartOptions,
} from '@src/repositories/cart/repository';

const cartEntityKeys = [
  'id',
  'organizationId',
  'storeId',
  'orderType',
  'checkoutMode',
  'status',
  'joinCode',
  'tableNumber',
  'participants',
  'items',
  'notes',
  'subtotal',
  'serviceFeeRate',
  'serviceFeeAmount',
  'totalAmount',
  'orderId',
  'createdAt',
  'updatedAt',
] as const satisfies readonly (keyof CartEntity)[];

const cartEntityKeyCoverage: Record<
  Exclude<keyof CartEntity, (typeof cartEntityKeys)[number]>,
  never
> = {};

function toCartEntity(doc: CartEntity): CartEntity {
  void cartEntityKeyCoverage;

  return Object.fromEntries(
    cartEntityKeys.map((key) => [key, doc[key]]),
  ) as CartEntity;
}

export const cartMongoRepository = {
  async create(input: CreateCartInput) {
    const doc = new CartMongoModel({
      id: `cart-${randomUUID()}`,
      organizationId: input.organizationId,
      storeId: input.storeId,
      orderType: input.orderType,
      checkoutMode: input.checkoutMode,
      ...(input.joinCode !== undefined ? { joinCode: input.joinCode } : {}),
      ...(input.tableNumber !== undefined
        ? { tableNumber: input.tableNumber }
        : {}),
      participants: input.participants,
      serviceFeeRate: input.serviceFeeRate,
    });

    await doc.save();
    return toCartEntity(doc.toObject());
  },

  async findById(cartId: string) {
    const doc = await CartMongoModel.findOne({ id: cartId })
      .lean<CartEntity>()
      .exec();

    return doc ? toCartEntity(doc) : null;
  },

  async findByJoinCode(joinCode: string) {
    const doc = await CartMongoModel.findOne({ joinCode })
      .lean<CartEntity>()
      .exec();

    return doc ? toCartEntity(doc) : null;
  },

  async update(
    cartId: string,
    input: UpdateCartInput,
    options?: UpdateCartOptions,
  ) {
    const setUpdate: Record<string, unknown> = {};

    const set = (path: string, value: unknown) => {
      if (value !== undefined) setUpdate[path] = value;
    };

    set('status', input.status);
    set('participants', input.participants);
    set('items', input.items);
    set('notes', input.notes);
    set('subtotal', input.subtotal);
    set('serviceFeeAmount', input.serviceFeeAmount);
    set('totalAmount', input.totalAmount);
    set('orderId', input.orderId);

    if (Object.keys(setUpdate).length === 0) {
      const existing = await CartMongoModel.findOne({ id: cartId })
        .lean<CartEntity>()
        .exec();

      return existing ? toCartEntity(existing) : null;
    }

    const filter: Record<string, unknown> = { id: cartId };
    if (options?.expectedUpdatedAt !== undefined) {
      filter.updatedAt = options.expectedUpdatedAt;
    }

    const doc = await CartMongoModel.findOneAndUpdate(
      filter,
      { $set: setUpdate },
      { new: true, runValidators: true },
    )
      .lean<CartEntity>()
      .exec();

    return doc ? toCartEntity(doc) : null;
  },
};
