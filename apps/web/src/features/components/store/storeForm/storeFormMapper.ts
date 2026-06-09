import type { Store, CreateStoreRequest, UpdateStoreRequest } from '@/models/store';
import type { StoreFormValues } from './useStoreForm';

export function fromStore(store: Store): StoreFormValues {
  return {
    displayName: store.profile.displayName,
    description: store.profile.description ?? {},
    defaultLocale: store.locale.defaultLocale,
    supportedLocales: store.locale.supportedLocales,
    serviceFeeRate: store.operation.serviceFeeRate,
    businessHours: store.operation.businessHours.map((h) => ({
      dayOfWeek: h.dayOfWeek,
      isOpen: h.isOpen,
      openTime: h.openTime ?? '',
      closeTime: h.closeTime ?? '',
    })),
    orderModes: store.operation.orderModes,
  };
}

function buildStoreBody(values: StoreFormValues) {
  const hasDescription = Object.values(values.description).some(Boolean);

  return {
    profile: {
      displayName: values.displayName,
      ...(hasDescription ? { description: values.description } : {}),
    },
    locale: {
      defaultLocale: values.defaultLocale,
      supportedLocales: values.supportedLocales,
    },
    operation: {
      serviceFeeRate: values.serviceFeeRate,
      businessHours: values.businessHours.map((h) => ({
        dayOfWeek: h.dayOfWeek,
        isOpen: h.isOpen,
        ...(h.isOpen ? { openTime: h.openTime, closeTime: h.closeTime } : {}),
      })),
      orderModes: values.orderModes,
    },
  };
}

export function toUpdateStoreRequest(
  values: StoreFormValues,
): UpdateStoreRequest {
  return buildStoreBody(values);
}

export function toCreateStoreRequest(
  values: StoreFormValues,
): CreateStoreRequest {
  return buildStoreBody(values);
}
