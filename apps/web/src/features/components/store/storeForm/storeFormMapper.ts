import deepEqual from 'fast-deep-equal';
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

  const displayNameChanged = !deepEqual(original.displayName, current.displayName);
  const descriptionChanged = !deepEqual(original.description, current.description);
  if (displayNameChanged || descriptionChanged) {
    const profile: NonNullable<UpdateStoreRequest['profile']> = {};
    if (displayNameChanged) profile.displayName = current.displayName;
    if (descriptionChanged && Object.values(current.description).some(Boolean)) {
      profile.description = current.description;
    }
    patch.profile = profile;
  }

  const defaultLocaleChanged = original.defaultLocale !== current.defaultLocale;
  const supportedLocalesChanged = !deepEqual(original.supportedLocales, current.supportedLocales);
  if (defaultLocaleChanged || supportedLocalesChanged) {
    const locale: NonNullable<UpdateStoreRequest['locale']> = {};
    if (defaultLocaleChanged) locale.defaultLocale = current.defaultLocale;
    if (supportedLocalesChanged) locale.supportedLocales = current.supportedLocales;
    patch.locale = locale;
  }

  const serviceFeeRateChanged = original.serviceFeeRate !== current.serviceFeeRate;
  const businessHoursChanged = !deepEqual(original.businessHours, current.businessHours);
  const orderModesChanged = !deepEqual(original.orderModes, current.orderModes);
  if (serviceFeeRateChanged || businessHoursChanged || orderModesChanged) {
    const operation: NonNullable<UpdateStoreRequest['operation']> = {};
    if (serviceFeeRateChanged) operation.serviceFeeRate = current.serviceFeeRate;
    if (businessHoursChanged) operation.businessHours = buildBusinessHours(current.businessHours);
    if (orderModesChanged) operation.orderModes = current.orderModes;
    patch.operation = operation;
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
