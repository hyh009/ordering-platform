import { cartStatuses } from '@src/models/cart/model';
import {
  hasAtLeastOneLocalizedValue,
  localizedStringSchema,
} from '@src/models/common/localizedString.mongo';
import { mongoValidationMessages } from '@src/models/common/validationMessages';
import {
  storeOrderTypes,
  storeSettingsCheckoutModes,
} from '@src/models/storeSettings/model';
import { model, models, Schema } from 'mongoose';

import type {
  CartEntity,
  CartItemSnapshot,
  OrderingParticipantSnapshot,
  SelectedModifierOptionSnapshot,
} from '@src/models/cart/model';
import type { LocalizedString } from '@src/models/common/model';
import type { Model } from 'mongoose';

function localizedSnapshotNameField(fieldName: string) {
  return {
    type: localizedStringSchema,
    required: true,
    validate: {
      validator(value: LocalizedString | null | undefined) {
        return hasAtLeastOneLocalizedValue(value);
      },
      message: mongoValidationMessages.localizedStringRequired(fieldName),
    },
  };
}

export const participantSnapshotSchema =
  new Schema<OrderingParticipantSnapshot>(
    {
      id: {
        type: String,
        required: true,
        trim: true,
      },
      displayName: {
        type: String,
        trim: true,
      },
      joinedAt: {
        type: Date,
        required: true,
        default: Date.now,
      },
    },
    { _id: false },
  );

export const selectedModifierOptionSnapshotSchema =
  new Schema<SelectedModifierOptionSnapshot>(
    {
      modifierId: {
        type: String,
        required: true,
        trim: true,
      },
      modifierName: {
        ...localizedSnapshotNameField('modifierName'),
      },
      optionId: {
        type: String,
        required: true,
        trim: true,
      },
      optionName: {
        ...localizedSnapshotNameField('optionName'),
      },
      priceAdjustment: {
        type: Number,
        required: true,
        default: 0,
      },
    },
    { _id: false },
  );

export const cartItemSnapshotSchema = new Schema<CartItemSnapshot>(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    productId: {
      type: String,
      required: true,
      trim: true,
    },
    productName: {
      ...localizedSnapshotNameField('productName'),
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    selectedOptions: {
      type: [selectedModifierOptionSnapshotSchema],
      default: [],
    },
    addedByParticipantId: {
      type: String,
      trim: true,
    },
    participantDisplayName: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    totalItemPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false },
);

const cartSchema = new Schema<CartEntity>(
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
    status: {
      type: String,
      required: true,
      enum: cartStatuses,
      default: 'active',
    },
    joinCode: {
      type: String,
      trim: true,
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
    orderId: {
      type: String,
      trim: true,
    },
  },
  {
    collection: 'carts',
    id: false,
    optimisticConcurrency: true,
    timestamps: true,
  },
);

export const CartMongoModel =
  (models.Cart as Model<CartEntity> | undefined) ??
  model<CartEntity>('Cart', cartSchema);
