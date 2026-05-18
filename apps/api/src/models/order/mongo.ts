import {
  cartItemSnapshotSchema,
  participantSnapshotSchema,
} from '@src/models/cart/mongo';
import {
  orderBatchStatuses,
  orderPaymentStatuses,
  orderStatuses,
} from '@src/models/order/model';
import {
  storeOrderTypes,
  storeSettingsCheckoutModes,
} from '@src/models/storeSettings/model';
import { model, models, Schema } from 'mongoose';

import type { OrderBatchSnapshot, OrderEntity } from '@src/models/order/model';
import type { Model } from 'mongoose';

const orderBatchSnapshotSchema = new Schema<OrderBatchSnapshot>(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    batchNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      required: true,
      enum: orderBatchStatuses,
      default: 'pending_confirmation',
    },
    submittedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    submittedByParticipantId: {
      type: String,
      trim: true,
    },
    confirmedAt: {
      type: Date,
    },
    readyAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    items: {
      type: [cartItemSnapshotSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderEntity>(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    organizationId: {
      type: String,
      required: true,
      trim: true,
    },
    cartId: {
      type: String,
      trim: true,
    },
    orderType: {
      type: String,
      required: true,
      enum: storeOrderTypes,
    },
    checkoutMode: {
      type: String,
      required: true,
      enum: storeSettingsCheckoutModes,
    },
    businessDate: {
      type: String,
      required: true,
      trim: true,
    },
    dailySequence: {
      type: Number,
      required: true,
      min: 1,
    },
    displayNumber: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: orderStatuses,
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: orderPaymentStatuses,
    },
    tableNumber: {
      type: String,
      trim: true,
    },
    participants: {
      type: [participantSnapshotSchema],
      default: [],
    },
    items: {
      type: [cartItemSnapshotSchema],
      default: [],
    },
    batches: {
      type: [orderBatchSnapshotSchema],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    serviceFeeRate: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0,
    },
    serviceFeeAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    paidAt: {
      type: Date,
    },
    servedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
  },
  {
    collection: 'orders',
    id: false,
    optimisticConcurrency: true,
    timestamps: true,
  },
);

export const OrderMongoModel =
  (models.Order as Model<OrderEntity> | undefined) ??
  model<OrderEntity>('Order', orderSchema);
