import { userRoles, userStatuses } from '@src/models/user/model';
import { model, models, Schema } from 'mongoose';

import type { UserEntity } from '@src/models/user/model';
import type { Model } from 'mongoose';

const userSchema = new Schema<UserEntity>(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    roles: {
      type: [String],
      required: true,
      enum: userRoles,
      default: ['user'],
    },
    status: {
      type: String,
      required: true,
      enum: userStatuses,
      default: 'active',
    },
    tokenVersion: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  {
    collection: 'users',
    id: false,
    timestamps: true,
  },
);

userSchema.index({ email: 1 }, { unique: true });

export const UserMongoModel =
  (models.User as Model<UserEntity> | undefined) ??
  model<UserEntity>('User', userSchema);
