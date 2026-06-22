import { randomUUID } from 'node:crypto';

import { OrderMongoModel } from '@src/models/order/mongo';

import type { OrderEntity } from '@src/models/order/model';
import type {
  CreateOrderInput,
  UpdateOrderInput,
  UpdateOrderOptions,
} from '@src/repositories/order/repository';
import type { ClientSession } from 'mongoose';

const orderEntityKeys = [
  'id',
  'organizationId',
  'storeId',
  'cartId',
  'orderType',
  'checkoutMode',
  'businessDate',
  'dailySequence',
  'displayNumber',
  'status',
  'paymentStatus',
  'tableNumber',
  'participants',
  'items',
  'batches',
  'notes',
  'subtotal',
  'serviceFeeRate',
  'serviceFeeAmount',
  'totalAmount',
  'orderingClosesAt',
  'paidAt',
  'servedAt',
  'completedAt',
  'cancelledAt',
  'createdAt',
  'updatedAt',
] as const satisfies readonly (keyof OrderEntity)[];

const orderEntityKeyCoverage: Record<
  Exclude<keyof OrderEntity, (typeof orderEntityKeys)[number]>,
  never
> = {};

function toOrderEntity(doc: OrderEntity): OrderEntity {
  void orderEntityKeyCoverage;

  return Object.fromEntries(
    orderEntityKeys.map((key) => [key, doc[key]]),
  ) as OrderEntity;
}

export const orderMongoRepository = {
  async create(input: CreateOrderInput, session?: ClientSession) {
    const doc = new OrderMongoModel({
      id: `order-${randomUUID()}`,
      organizationId: input.organizationId,
      storeId: input.storeId,
      ...(input.cartId !== undefined ? { cartId: input.cartId } : {}),
      orderType: input.orderType,
      checkoutMode: input.checkoutMode,
      businessDate: input.businessDate,
      dailySequence: input.dailySequence,
      displayNumber: input.displayNumber,
      status: input.status,
      paymentStatus: input.paymentStatus,
      ...(input.tableNumber !== undefined
        ? { tableNumber: input.tableNumber }
        : {}),
      participants: input.participants,
      items: input.items,
      batches: input.batches,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      subtotal: input.subtotal,
      serviceFeeRate: input.serviceFeeRate,
      serviceFeeAmount: input.serviceFeeAmount,
      totalAmount: input.totalAmount,
      orderingClosesAt: input.orderingClosesAt,
    });

    await doc.save({ session: session ?? null });
    return toOrderEntity(doc.toObject());
  },

  async findById(orderId: string, session?: ClientSession) {
    const doc = await OrderMongoModel.findOne({ id: orderId })
      .session(session ?? null)
      .lean<OrderEntity>()
      .exec();

    return doc ? toOrderEntity(doc) : null;
  },

  async findByStoreAndParticipant(storeId: string, participantId: string) {
    const doc = await OrderMongoModel.findOne({
      storeId,
      'participants.id': participantId,
    })
      .lean<OrderEntity>()
      .exec();

    return doc ? toOrderEntity(doc) : null;
  },

  async update(
    orderId: string,
    input: UpdateOrderInput,
    options?: UpdateOrderOptions,
  ) {
    const setUpdate: Record<string, unknown> = {};

    const set = (path: string, value: unknown) => {
      if (value !== undefined) setUpdate[path] = value;
    };

    set('status', input.status);
    set('paymentStatus', input.paymentStatus);
    set('participants', input.participants);
    set('items', input.items);
    set('batches', input.batches);
    set('notes', input.notes);
    set('subtotal', input.subtotal);
    set('serviceFeeAmount', input.serviceFeeAmount);
    set('totalAmount', input.totalAmount);
    set('paidAt', input.paidAt);
    set('servedAt', input.servedAt);
    set('completedAt', input.completedAt);
    set('cancelledAt', input.cancelledAt);

    if (Object.keys(setUpdate).length === 0) {
      const existing = await OrderMongoModel.findOne({ id: orderId })
        .session(options?.session ?? null)
        .lean<OrderEntity>()
        .exec();

      return existing ? toOrderEntity(existing) : null;
    }

    const filter: Record<string, unknown> = { id: orderId };
    if (options?.expectedUpdatedAt !== undefined) {
      filter.updatedAt = options.expectedUpdatedAt;
    }

    const doc = await OrderMongoModel.findOneAndUpdate(
      filter,
      { $set: setUpdate },
      { new: true, runValidators: true, session: options?.session ?? null },
    )
      .lean<OrderEntity>()
      .exec();

    return doc ? toOrderEntity(doc) : null;
  },
};
