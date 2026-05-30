import { counterScopes } from '@src/models/counter/model';
import { model, models, Schema } from 'mongoose';

import type { CounterEntity } from '@src/models/counter/model';
import type { Model } from 'mongoose';

const counterSchema = new Schema<CounterEntity>(
  {
    _id: {
      type: String,
      required: true,
      trim: true,
    },
    scope: {
      type: String,
      required: true,
      enum: counterScopes,
    },
    storeId: {
      type: String,
      required: true,
      trim: true,
    },
    businessDate: {
      type: String,
      required: true,
      trim: true,
    },
    sequence: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    collection: 'counters',
    id: false,
    timestamps: true,
  },
);

export const CounterMongoModel =
  (models.Counter as Model<CounterEntity> | undefined) ??
  model<CounterEntity>('Counter', counterSchema);
