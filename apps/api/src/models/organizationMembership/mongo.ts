import {
  organizationMembershipRoles,
  organizationMembershipStatuses,
} from '@src/models/organizationMembership/model';
import { model, models, Schema } from 'mongoose';

import type { OrganizationMembershipEntity } from '@src/models/organizationMembership/model';
import type { Model } from 'mongoose';

const organizationMembershipSchema = new Schema<OrganizationMembershipEntity>(
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
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: organizationMembershipRoles,
    },
    status: {
      type: String,
      required: true,
      enum: organizationMembershipStatuses,
      default: 'active',
    },
  },
  {
    collection: 'organizationMemberships',
    id: false,
    timestamps: true,
  },
);

organizationMembershipSchema.index({ id: 1 }, { unique: true });
organizationMembershipSchema.index(
  { organizationId: 1, userId: 1 },
  { unique: true },
);
organizationMembershipSchema.index({ userId: 1, status: 1 });
organizationMembershipSchema.index({
  organizationId: 1,
  role: 1,
  status: 1,
});

export const OrganizationMembershipMongoModel =
  (models.OrganizationMembership as
    | Model<OrganizationMembershipEntity>
    | undefined) ??
  model<OrganizationMembershipEntity>(
    'OrganizationMembership',
    organizationMembershipSchema,
  );
