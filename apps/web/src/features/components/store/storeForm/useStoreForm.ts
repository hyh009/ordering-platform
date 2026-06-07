import { useState, useCallback } from 'react';
import type { LocalizedStringDto, SupportedLocale, StoreOrderType, StoreCheckoutMode } from '@repo/shared';

export type BusinessHourFormValue = {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};

export type OrderModeFormValue = {
  type: StoreOrderType;
  isEnabled: boolean;
  checkoutMode: StoreCheckoutMode;
};

export type StoreFormValues = {
  displayName: LocalizedStringDto;
  description: LocalizedStringDto;
  defaultLocale: SupportedLocale;
  supportedLocales: SupportedLocale[];
  serviceFeeRate: number;
  businessHours: BusinessHourFormValue[];
  orderModes: OrderModeFormValue[];
};

export type StoreFormFieldErrors = Partial<Record<keyof StoreFormValues, string>>;

const DEFAULT_BUSINESS_HOURS: BusinessHourFormValue[] = [0, 1, 2, 3, 4, 5, 6].map(
  (day) => ({
    dayOfWeek: day,
    isOpen: day >= 1 && day <= 5,
    openTime: '09:00',
    closeTime: '21:00',
  }),
);

export const defaultStoreFormValues: StoreFormValues = {
  displayName: {},
  description: {},
  defaultLocale: 'zh-TW',
  supportedLocales: ['zh-TW'],
  serviceFeeRate: 0,
  businessHours: DEFAULT_BUSINESS_HOURS,
  orderModes: [
    { type: 'dine_in', isEnabled: true, checkoutMode: 'pay_later' },
    { type: 'takeaway', isEnabled: true, checkoutMode: 'pay_first' },
  ],
};

export type StoreFormVM = {
  values: StoreFormValues;
  fieldErrors: StoreFormFieldErrors;
  submitError: string | null;
  isSubmitting: boolean;
  setField<K extends keyof StoreFormValues>(key: K, value: StoreFormValues[K]): void;
  setBusinessHour(dayOfWeek: number, update: Partial<BusinessHourFormValue>): void;
  setOrderMode(type: StoreOrderType, update: Partial<Pick<OrderModeFormValue, 'isEnabled' | 'checkoutMode'>>): void;
  toggleSupportedLocale(locale: SupportedLocale): void;
  setFieldErrors(errors: StoreFormFieldErrors): void;
  setSubmitError(error: string | null): void;
  setIsSubmitting(value: boolean): void;
  reset(values?: StoreFormValues): void;
};

export function useStoreForm(initial?: StoreFormValues): StoreFormVM {
  const [values, setValues] = useState<StoreFormValues>(
    initial ?? defaultStoreFormValues,
  );
  const [fieldErrors, setFieldErrors] = useState<StoreFormFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = useCallback(
    <K extends keyof StoreFormValues>(key: K, value: StoreFormValues[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [],
  );

  const setBusinessHour = useCallback(
    (dayOfWeek: number, update: Partial<BusinessHourFormValue>) => {
      setValues((prev) => ({
        ...prev,
        businessHours: prev.businessHours.map((h) =>
          h.dayOfWeek === dayOfWeek ? { ...h, ...update } : h,
        ),
      }));
    },
    [],
  );

  const setOrderMode = useCallback(
    (type: StoreOrderType, update: Partial<Pick<OrderModeFormValue, 'isEnabled' | 'checkoutMode'>>) => {
      setValues((prev) => ({
        ...prev,
        orderModes: prev.orderModes.map((m) => (m.type === type ? { ...m, ...update } : m)),
      }));
    },
    [],
  );

  const toggleSupportedLocale = useCallback((locale: SupportedLocale) => {
    setValues((prev) => {
      const has = prev.supportedLocales.includes(locale);
      if (has && prev.supportedLocales.length === 1) return prev;
      const next = has
        ? prev.supportedLocales.filter((l) => l !== locale)
        : [...prev.supportedLocales, locale];
      return { ...prev, supportedLocales: next };
    });
  }, []);

  const reset = useCallback((next?: StoreFormValues) => {
    setValues(next ?? defaultStoreFormValues);
    setFieldErrors({});
    setSubmitError(null);
    setIsSubmitting(false);
  }, []);

  return {
    values,
    fieldErrors,
    submitError,
    isSubmitting,
    setField,
    setBusinessHour,
    setOrderMode,
    toggleSupportedLocale,
    setFieldErrors: useCallback((e) => setFieldErrors(e), []),
    setSubmitError: useCallback((e) => setSubmitError(e), []),
    setIsSubmitting: useCallback((v) => setIsSubmitting(v), []),
    reset,
  };
}
