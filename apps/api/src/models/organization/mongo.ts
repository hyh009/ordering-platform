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
    countryCode: {
      type: String,
      required: true,
      trim: true,
      enum: ['TW'],
    },
    schemaVersion: {
      type: Number,
      required: true,
      enum: [1],
    },
    formatted: {
      type: String,
      required: true,
      trim: true,
      maxlength: 360,
    },
    tw: {
      postalCode: {
        type: String,
        required: true,
        trim: true,
        match: /^\d{3}(\d{2,3})?$/,
      },
      city: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
      },
      district: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
      },
      streetAddress: {
        type: String,
        required: true,
        trim: true,
        maxlength: 240,
      },
    },
  },
  { _id: false },
);

const organizationPhoneSchema = new Schema(
  {
    countryCode: {
      type: String,
      required: true,
      trim: true,
      enum: ['TW'],
    },
    e164: {
      type: String,
      required: true,
      trim: true,
      match: /^\+886\d{7,9}$/,
    },
    nationalNumber: {
      type: String,
      required: true,
      trim: true,
      match: /^0\d{7,9}$/,
    },
    type: {
      type: String,
      required: true,
      enum: ['mobile', 'landline', 'toll_free'],
    },
    extension: {
      type: String,
      trim: true,
      match: /^\d{1,10}$/,
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
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
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
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 320,
    },
    contactPhone: {
      type: organizationPhoneSchema,
      required: true,
    },
    address: {
      type: organizationAddressSchema,
      required: true,
    },
  },
  {
    collection: 'organizations',
    id: false,
    timestamps: true,
  },
);

organizationSchema.index({ id: 1 }, { unique: true });
organizationSchema.index({ slug: 1 }, { unique: true });
organizationSchema.index({ status: 1 });
applySoftDeletePlugin(organizationSchema);

export const OrganizationMongoModel =
  (models.Organization as Model<OrganizationEntity> | undefined) ??
  model<OrganizationEntity>('Organization', organizationSchema);
