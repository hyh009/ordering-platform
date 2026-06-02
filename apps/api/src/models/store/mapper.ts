import type { BusinessHour, StoreEntity } from './model';
import type { BusinessHourDto, StoreDto, StoreListItemDto } from '@repo/shared';

function toBusinessHourDto(bh: BusinessHour): BusinessHourDto {
  const dto: BusinessHourDto = { dayOfWeek: bh.dayOfWeek, isOpen: bh.isOpen };
  if (bh.openTime !== undefined) dto.openTime = bh.openTime;
  if (bh.closeTime !== undefined) dto.closeTime = bh.closeTime;
  return dto;
}

export function toStoreListItemDto(store: StoreEntity): StoreListItemDto {
  return {
    id: store.id,
    profile: { displayName: store.profile.displayName },
    locale: {
      defaultLocale: store.locale.defaultLocale,
      supportedLocales: store.locale.supportedLocales,
    },
    status: store.status,
    updatedAt: store.updatedAt.toISOString(),
  };
}

export function toStoreDto(store: StoreEntity): StoreDto {
  const profile: StoreDto['profile'] = {
    displayName: store.profile.displayName,
  };
  if (store.profile.description !== undefined) {
    profile.description = store.profile.description;
  }

  return {
    id: store.id,
    organizationId: store.organizationId,
    profile,
    locale: {
      defaultLocale: store.locale.defaultLocale,
      supportedLocales: store.locale.supportedLocales,
    },
    operation: {
      businessHours: store.operation.businessHours.map(toBusinessHourDto),
      serviceFeeRate: store.operation.serviceFeeRate,
      orderModes: store.operation.orderModes.map((mode) => ({
        type: mode.type,
        isEnabled: mode.isEnabled,
        checkoutMode: mode.checkoutMode,
      })),
    },
    status: store.status,
    createdAt: store.createdAt.toISOString(),
    updatedAt: store.updatedAt.toISOString(),
  };
}
