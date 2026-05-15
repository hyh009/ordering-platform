import { organizationStatuses } from '@src/models/organization/model';
import { applySoftDeletePlugin } from '@src/models/plugins/softDelete';
import { model, models, Schema } from 'mongoose';

import type { OrganizationEntity } from '@src/models/organization/model';
import type { Model } from 'mongoose';

const organizationSchema = new Schema<OrganizationEntity>(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: organizationStatuses,
      default: 'active',
    },
  },
  {
    collection: 'organizations',
    id: false,
    timestamps: true,
  },
);

organizationSchema.index({ status: 1 });
applySoftDeletePlugin(organizationSchema);

export const OrganizationMongoModel =
  (models.Organization as Model<OrganizationEntity> | undefined) ??
  model<OrganizationEntity>('Organization', organizationSchema);
