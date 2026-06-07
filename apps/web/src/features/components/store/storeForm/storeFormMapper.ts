import type { CreateStoreRequest } from '@repo/shared';
import type { StoreFormValues } from './useStoreForm';

export function toCreateStoreRequest(values: StoreFormValues): CreateStoreRequest {
  const descriptionKeys = Object.keys(values.description) as (keyof typeof values.description)[];
  const hasDescription = descriptionKeys.some((k) => values.description[k]);

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
