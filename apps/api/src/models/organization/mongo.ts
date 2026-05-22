import {
  organizationReviewStatuses,
  organizationStatuses,
} from '@src/models/organization/model';
import { applySoftDeletePlugin } from '@src/models/plugins/softDelete';
import { model, models, Schema } from 'mongoose';

import type { OrganizationEntity } from '@src/models/organization/model';
import type { Model } from 'mongoose';

const organizationAddressSchema = new Schema(
  {
    country: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    postalCode: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    city: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    district: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    line1: {
      type: String,
      trim: true,
      maxlength: 240,
    },
    line2: {
      type: String,
      trim: true,
      maxlength: 240,
    },
  },
  { _id: false },
);

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
    reviewStatus: {
      type: String,
      required: true,
      enum: organizationReviewStatuses,
      default: 'pending',
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 320,
    },
    contactPhone: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    address: organizationAddressSchema,
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
