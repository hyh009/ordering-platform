import { toStoreDto, toStoreListItemDto } from '@src/models/store/mapper';
import { organizationRepository } from '@src/repositories/organization/repository';
import { storeRepository } from '@src/repositories/store/repository';
import { ERROR_CODES } from '@src/utils/errorCode';
import { NotFoundError } from '@src/utils/errors';

import type { StoreDto, StoreListItemDto } from '@repo/shared';
import type { SupportedLocale } from '@src/models/common/model';
import type {
  BusinessHour,
  StoreOrderMode,
  StoreProfile,
  StoreStatus,
} from '@src/models/store/model';

type BusinessHourInput = {
  dayOfWeek: number;
  isOpen: boolean;
  openTime?: string | undefined;
  closeTime?: string | undefined;
};

export type CreateStoreInput = {
  organizationId: string;
  profile: {
    displayName: StoreProfile['displayName'];
    description?: StoreProfile['description'] | undefined;
  };
  locale: {
    defaultLocale: SupportedLocale;
    supportedLocales: SupportedLocale[];
  };
  operation: {
    businessHours: BusinessHourInput[];
    serviceFeeRate: number;
    orderModes: StoreOrderMode[];
  };
};

export type UpdateStoreInput = {
  profile?: {
    displayName?: StoreProfile['displayName'] | undefined;
    description?: StoreProfile['description'] | undefined;
  } | undefined;
  locale?: {
    defaultLocale?: SupportedLocale | undefined;
    supportedLocales?: SupportedLocale[] | undefined;
  } | undefined;
  operation?: {
    businessHours?: BusinessHourInput[] | undefined;
    serviceFeeRate?: number | undefined;
    orderModes?: StoreOrderMode[] | undefined;
  } | undefined;
  status?: StoreStatus | undefined;
};

export type ListStoresResult = {
  stores: StoreListItemDto[];
  pagination: { offset: number; limit: number; total: number };
};

function toBusinessHour(bh: BusinessHourInput): BusinessHour {
  const hour: BusinessHour = { dayOfWeek: bh.dayOfWeek, isOpen: bh.isOpen };
  if (bh.openTime !== undefined) hour.openTime = bh.openTime;
  if (bh.closeTime !== undefined) hour.closeTime = bh.closeTime;
  return hour;
}

export class StoreService {
  public async createStore(input: CreateStoreInput): Promise<StoreDto> {
    const org = await organizationRepository.findById(input.organizationId);

    if (!org) {
      throw new NotFoundError(
        'Organization not found',
        ERROR_CODES.ORGANIZATION_NOT_FOUND,
      );
    }

    const profile: StoreProfile = { displayName: input.profile.displayName };
    if (input.profile.description !== undefined) {
      profile.description = input.profile.description;
    }

    const store = await storeRepository.create({
      organizationId: input.organizationId,
      profile,
      locale: input.locale,
      operation: {
        businessHours: input.operation.businessHours.map(toBusinessHour),
        serviceFeeRate: input.operation.serviceFeeRate,
        orderModes: input.operation.orderModes,
      },
    });

    return toStoreDto(store);
  }

  public async getStore(storeId: string): Promise<StoreDto> {
    const store = await storeRepository.findById(storeId);

    if (!store) {
      throw new NotFoundError('Store not found', ERROR_CODES.STORE_NOT_FOUND);
    }

    return toStoreDto(store);
  }

  public async listStores(
    organizationId: string,
    query: { offset: number; limit: number },
  ): Promise<ListStoresResult> {
    const org = await organizationRepository.findById(organizationId);

    if (!org) {
      throw new NotFoundError(
        'Organization not found',
        ERROR_CODES.ORGANIZATION_NOT_FOUND,
      );
    }

    const result = await storeRepository.listByOrganization({
      organizationId,
      offset: query.offset,
      limit: query.limit,
    });

    return {
      stores: result.stores.map(toStoreListItemDto),
      pagination: { offset: query.offset, limit: query.limit, total: result.total },
    };
  }

  public async updateStore(
    storeId: string,
    organizationId: string,
    input: UpdateStoreInput,
  ): Promise<StoreDto> {
    const store = await storeRepository.findById(storeId);

    if (!store || store.organizationId !== organizationId) {
      throw new NotFoundError('Store not found', ERROR_CODES.STORE_NOT_FOUND);
    }

    const repoInput: Parameters<typeof storeRepository.update>[1] = {};

    if (input.profile !== undefined) {
      const profile: NonNullable<Parameters<typeof storeRepository.update>[1]['profile']> = {};
      if (input.profile.displayName !== undefined) profile.displayName = input.profile.displayName;
      if (input.profile.description !== undefined) profile.description = input.profile.description;
      repoInput.profile = profile;
    }

    if (input.locale !== undefined) {
      const locale: NonNullable<Parameters<typeof storeRepository.update>[1]['locale']> = {};
      if (input.locale.defaultLocale !== undefined) locale.defaultLocale = input.locale.defaultLocale;
      if (input.locale.supportedLocales !== undefined) locale.supportedLocales = input.locale.supportedLocales;
      repoInput.locale = locale;
    }

    if (input.operation !== undefined) {
      const operation: NonNullable<Parameters<typeof storeRepository.update>[1]['operation']> = {};
      if (input.operation.businessHours !== undefined) {
        operation.businessHours = input.operation.businessHours.map(toBusinessHour);
      }
      if (input.operation.serviceFeeRate !== undefined) operation.serviceFeeRate = input.operation.serviceFeeRate;
      if (input.operation.orderModes !== undefined) operation.orderModes = input.operation.orderModes;
      repoInput.operation = operation;
    }

    if (input.status !== undefined) repoInput.status = input.status;

    const updated = await storeRepository.update(storeId, repoInput);

    if (!updated) {
      throw new NotFoundError('Store not found', ERROR_CODES.STORE_NOT_FOUND);
    }

    return toStoreDto(updated);
  }
}

export function createStoreService() {
  return new StoreService();
}

export const storeService = createStoreService();
