import { storeMongoRepository } from '@src/repositories/store/mongo.repository';

import type {
  BusinessHour,
  StoreEntity,
  StoreLocale,
  StoreOperation,
  StoreOrderMode,
  StoreProfile,
  StoreStatus,
} from '@src/models/store/model';

export type CreateStoreInput = {
  organizationId: string;
  profile: StoreProfile;
  locale: StoreLocale;
  operation: StoreOperation;
};

export type ListStoresByOrganizationInput = {
  organizationId: string;
  offset: number;
  limit: number;
};

export type ListStoresByOrganizationResult = {
  stores: StoreEntity[];
  total: number;
};

export type UpdateStoreInput = {
  profile?: {
    displayName?: StoreProfile['displayName'];
    description?: StoreProfile['description'];
  };
  locale?: {
    defaultLocale?: StoreLocale['defaultLocale'];
    supportedLocales?: StoreLocale['supportedLocales'];
  };
  operation?: {
    businessHours?: BusinessHour[];
    serviceFeeRate?: number;
    orderModes?: StoreOrderMode[];
  };
  status?: StoreStatus;
};

export type StoreRepository = {
  create(input: CreateStoreInput): Promise<StoreEntity>;
  findById(storeId: string): Promise<StoreEntity | null>;
  listByOrganization(
    input: ListStoresByOrganizationInput,
  ): Promise<ListStoresByOrganizationResult>;
  update(storeId: string, input: UpdateStoreInput): Promise<StoreEntity | null>;
};

export const storeRepository: StoreRepository = storeMongoRepository;
