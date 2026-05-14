import { model, models, Schema } from 'mongoose';

import type { AuthSessionEntity } from '@src/models/authSession/model';
import type { Model } from 'mongoose';

const authSessionSchema = new Schema<AuthSessionEntity>(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'auth_sessions',
    id: false,
    timestamps: true,
  },
);

authSessionSchema.index({ refreshTokenHash: 1 }, { unique: true });
authSessionSchema.index({ userId: 1, revokedAt: 1 });
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthSessionMongoModel =
  (models.AuthSession as Model<AuthSessionEntity> | undefined) ??
  model<AuthSessionEntity>('AuthSession', authSessionSchema);
