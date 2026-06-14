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

function eq(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function buildBusinessHours(hours: StoreFormValues['businessHours']) {
  return hours.map((h) => ({
    dayOfWeek: h.dayOfWeek,
    isOpen: h.isOpen,
    ...(h.isOpen ? { openTime: h.openTime, closeTime: h.closeTime } : {}),
  }));
}

export function toUpdateStoreRequest(
  original: StoreFormValues,
  current: StoreFormValues,
): UpdateStoreRequest {
  const patch: UpdateStoreRequest = {};

  const displayNameChanged = !eq(original.displayName, current.displayName);
  const descriptionChanged = !eq(original.description, current.description);
  if (displayNameChanged || descriptionChanged) {
    const hasDescription = Object.values(current.description).some(Boolean);
    patch.profile = {
      ...(displayNameChanged ? { displayName: current.displayName } : {}),
      ...(descriptionChanged ? { description: hasDescription ? current.description : undefined } : {}),
    };
  }

  const defaultLocaleChanged = original.defaultLocale !== current.defaultLocale;
  const supportedLocalesChanged = !eq(original.supportedLocales, current.supportedLocales);
  if (defaultLocaleChanged || supportedLocalesChanged) {
    patch.locale = {
      ...(defaultLocaleChanged ? { defaultLocale: current.defaultLocale } : {}),
      ...(supportedLocalesChanged ? { supportedLocales: current.supportedLocales } : {}),
    };
  }

  const serviceFeeRateChanged = original.serviceFeeRate !== current.serviceFeeRate;
  const businessHoursChanged = !eq(original.businessHours, current.businessHours);
  const orderModesChanged = !eq(original.orderModes, current.orderModes);
  if (serviceFeeRateChanged || businessHoursChanged || orderModesChanged) {
    patch.operation = {
      ...(serviceFeeRateChanged ? { serviceFeeRate: current.serviceFeeRate } : {}),
      ...(businessHoursChanged ? { businessHours: buildBusinessHours(current.businessHours) } : {}),
      ...(orderModesChanged ? { orderModes: current.orderModes } : {}),
    };
  }

  return patch;
}

export function toCreateStoreRequest(values: StoreFormValues): CreateStoreRequest {
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
      businessHours: buildBusinessHours(values.businessHours),
      orderModes: values.orderModes,
    },
  };
}
