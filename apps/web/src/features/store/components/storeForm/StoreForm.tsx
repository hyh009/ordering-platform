import { useState, type FormEvent } from 'react';
import {
  supportedLocales,
  storeOrderTypes,
  storeCheckoutModes,
} from '@repo/shared';
import { useAppTranslation } from '@/app/i18n';
import { getSupportedCustomerLocaleLabel } from '@/models/metadata';
import {
  getStoreCheckoutModeLabel,
  getStoreOrderTypeLabel,
} from '@/models/store';
import { Field } from '@/shared/components/form/Field';
import { LocalizedStringInput } from '@/shared/components/LocalizedStringInput';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/utils/cn';
import type { StoreFormVM } from './useStoreForm';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function from24h(
  value: string,
): { h: number; m: number; period: 'AM' | 'PM' } | null {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const h24 = parseInt(value.slice(0, 2), 10);
  const m = parseInt(value.slice(3), 10);
  if (h24 === 0) return { h: 12, m, period: 'AM' };
  if (h24 < 12) return { h: h24, m, period: 'AM' };
  if (h24 === 12) return { h: 12, m, period: 'PM' };
  return { h: h24 - 12, m, period: 'PM' };
}

function to24h(h: number, m: number, period: 'AM' | 'PM'): string {
  const h24 = period === 'AM' ? (h === 12 ? 0 : h) : h === 12 ? 12 : h + 12;
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

type TimeInputProps = {
  ariaLabel: string;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
};

function BusinessHourTimeInput({
  ariaLabel,
  disabled,
  value,
  onChange,
}: TimeInputProps) {
  const parsed = from24h(value);
  const [h, setH] = useState(parsed ? String(parsed.h) : '');
  const [m, setM] = useState(parsed ? String(parsed.m).padStart(2, '0') : '00');
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed?.period ?? 'AM');

  // Sync the local editing buffers when the external value changes, using the
  // render-phase "previous prop" pattern. Calling setState during render (only
  // when the prop actually changed) is the React-recommended alternative to a
  // value-mirroring effect.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    const p = from24h(value);
    if (p) {
      setH(String(p.h));
      setM(String(p.m).padStart(2, '0'));
      setPeriod(p.period);
    } else if (!value) {
      setH('');
      setM('00');
    }
  }

  function emit(newH: string, newM: string, newPeriod: 'AM' | 'PM') {
    const hNum = parseInt(newH, 10);
    if (!newH || isNaN(hNum) || hNum < 1 || hNum > 12) {
      onChange('');
      return;
    }
    const mNum = Math.min(Math.max(parseInt(newM, 10) || 0, 0), 59);
    onChange(to24h(hNum, mNum, newPeriod));
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        aria-label={`${ariaLabel} hour`}
        className="h-8 w-12 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        disabled={disabled}
        max={12}
        min={1}
        placeholder="12"
        type="number"
        value={h}
        onChange={(e) => {
          setH(e.target.value);
          emit(e.target.value, m, period);
        }}
      />
      <span className="text-sm font-medium text-muted-foreground">:</span>
      <Input
        aria-label={`${ariaLabel} minute`}
        className="h-8 w-12 text-center"
        disabled={disabled}
        maxLength={2}
        placeholder="00"
        type="text"
        value={m}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 2);
          setM(v);
        }}
        onBlur={() => {
          const padded = (m || '0').padStart(2, '0');
          setM(padded);
          emit(h, padded, period);
        }}
      />
      <div className="flex overflow-hidden rounded-md border border-border">
        {(['AM', 'PM'] as const).map((p) => (
          <button
            key={p}
            className={cn(
              'h-8 px-2.5 text-xs font-medium transition-colors',
              disabled
                ? 'cursor-not-allowed text-muted-foreground'
                : period === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-foreground hover:bg-muted',
            )}
            disabled={disabled}
            type="button"
            onClick={() => {
              setPeriod(p);
              emit(h, m, p);
            }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

type StoreFormProps = {
  form: StoreFormVM;
  hideFooter?: boolean;
  id?: string;
  onCancel: () => void;
  onSubmit: () => void | Promise<void>;
};

export function StoreForm({
  form,
  hideFooter = false,
  id,
  onCancel,
  onSubmit,
}: StoreFormProps) {
  const { tDefault } = useAppTranslation();
  const shouldShowSubmitError =
    form.submitError && !Object.keys(form.fieldErrors).length;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit();
  }

  return (
    <form className="grid gap-8" id={id} onSubmit={handleSubmit}>
      {shouldShowSubmitError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {form.submitError}
        </p>
      )}

      {/* Locale */}
      <section className="grid gap-4">
        <h4 className="border-b border-border pb-2 text-sm font-semibold">
          Locale
        </h4>
        <Field
          error={form.fieldErrors.defaultLocale}
          label="Default locale"
          required
          renderControl={
            <div className="flex gap-2">
              {supportedLocales.map((locale) => (
                <button
                  key={locale}
                  className={cn(
                    'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                    form.values.defaultLocale === locale
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-foreground hover:bg-muted',
                  )}
                  disabled={form.isSubmitting}
                  type="button"
                  onClick={() => form.setField('defaultLocale', locale)}
                >
                  {getSupportedCustomerLocaleLabel(locale, tDefault)}
                </button>
              ))}
            </div>
          }
        />
        <Field
          error={form.fieldErrors.supportedLocales}
          label="Supported locales"
          required
          renderControl={
            <div className="grid gap-1.5">
              <div className="flex gap-2">
                {supportedLocales.map((locale) => {
                  const checked = form.values.supportedLocales.includes(locale);
                  return (
                    <button
                      key={locale}
                      className={cn(
                        'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                        checked
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-foreground hover:bg-muted',
                      )}
                      disabled={form.isSubmitting}
                      type="button"
                      onClick={() => form.toggleSupportedLocale(locale)}
                    >
                      {getSupportedCustomerLocaleLabel(locale, tDefault)}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                At least one locale required.
              </p>
            </div>
          }
        />
      </section>

      {/* Profile */}
      <section className="grid gap-4">
        <h4 className="border-b border-border pb-2 text-sm font-semibold">
          Profile
        </h4>
        <Field
          error={form.fieldErrors.displayName}
          label="Display name"
          required
          renderControl={
            <LocalizedStringInput
              allowedLocales={form.values.supportedLocales}
              defaultLocale={form.values.defaultLocale}
              disabled={form.isSubmitting}
              onChange={(v) => form.setField('displayName', v)}
              placeholder="Store name"
              value={form.values.displayName}
            />
          }
        />
        <Field
          label="Description"
          renderControl={
            <LocalizedStringInput
              allowedLocales={form.values.supportedLocales}
              defaultLocale={form.values.defaultLocale}
              disabled={form.isSubmitting}
              multiline
              onChange={(v) => form.setField('description', v)}
              placeholder="Short description (optional)"
              value={form.values.description}
            />
          }
        />
      </section>

      {/* Operation */}
      <section className="grid gap-4">
        <h4 className="border-b border-border pb-2 text-sm font-semibold">
          Operation
        </h4>

        <Field
          label="Order modes"
          renderControl={
            <div className="grid gap-3">
              {storeOrderTypes.map((type) => {
                const mode = form.values.orderModes.find(
                  (m) => m.type === type,
                );
                const enabled = mode?.isEnabled ?? false;
                return (
                  <div
                    key={type}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {getStoreOrderTypeLabel(type, tDefault)}
                      </span>
                      <button
                        aria-checked={enabled}
                        className={cn(
                          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none',
                          enabled ? 'bg-primary' : 'bg-muted',
                        )}
                        disabled={form.isSubmitting}
                        role="switch"
                        type="button"
                        onClick={() =>
                          form.setOrderMode(type, { isEnabled: !enabled })
                        }
                      >
                        <span
                          className={cn(
                            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
                            enabled ? 'translate-x-4' : 'translate-x-0',
                          )}
                        />
                      </button>
                    </div>
                    {enabled && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Checkout:
                        </span>
                        {storeCheckoutModes.map((checkoutMode) => (
                          <button
                            key={checkoutMode}
                            className={cn(
                              'rounded border px-2.5 py-1 text-xs font-medium transition-colors',
                              mode?.checkoutMode === checkoutMode
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-background text-foreground hover:bg-muted',
                            )}
                            disabled={form.isSubmitting}
                            type="button"
                            onClick={() =>
                              form.setOrderMode(type, { checkoutMode })
                            }
                          >
                            {getStoreCheckoutModeLabel(checkoutMode, tDefault)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          }
        />

        <Field
          description="0 = no fee, 1 = 100%"
          error={form.fieldErrors.serviceFeeRate}
          label="Service fee rate"
          renderControl={(id) => (
            <div className="flex items-center gap-2">
              <Input
                className="w-32"
                disabled={form.isSubmitting}
                id={id}
                max="1"
                min="0"
                step="0.01"
                type="number"
                value={form.values.serviceFeeRate}
                onChange={(e) =>
                  form.setField(
                    'serviceFeeRate',
                    parseFloat(e.target.value) || 0,
                  )
                }
              />
              <span className="text-sm text-muted-foreground">
                ({Math.round(form.values.serviceFeeRate * 100)}%)
              </span>
            </div>
          )}
        />

        <Field
          label="Business hours"
          renderControl={
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                      Day
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                      Open
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                      Open time
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                      Close time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {form.values.businessHours.map((hour) => (
                    <tr key={hour.dayOfWeek}>
                      <td className="px-4 py-2.5 font-medium">
                        {DAY_LABELS[hour.dayOfWeek]}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          aria-checked={hour.isOpen}
                          className={cn(
                            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none',
                            hour.isOpen ? 'bg-primary' : 'bg-muted',
                          )}
                          disabled={form.isSubmitting}
                          role="switch"
                          type="button"
                          onClick={() =>
                            form.setBusinessHour(hour.dayOfWeek, {
                              isOpen: !hour.isOpen,
                            })
                          }
                        >
                          <span
                            className={cn(
                              'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
                              hour.isOpen ? 'translate-x-4' : 'translate-x-0',
                            )}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-2">
                        <BusinessHourTimeInput
                          ariaLabel={`${DAY_LABELS[hour.dayOfWeek]} open time`}
                          disabled={!hour.isOpen || form.isSubmitting}
                          value={hour.openTime ?? ''}
                          onChange={(v) =>
                            form.setBusinessHour(hour.dayOfWeek, {
                              openTime: v,
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <BusinessHourTimeInput
                          ariaLabel={`${DAY_LABELS[hour.dayOfWeek]} close time`}
                          disabled={!hour.isOpen || form.isSubmitting}
                          value={hour.closeTime ?? ''}
                          onChange={(v) =>
                            form.setBusinessHour(hour.dayOfWeek, {
                              closeTime: v,
                            })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        />
      </section>

      {!hideFooter && (
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel} type="button" variant="ghost">
            Cancel
          </Button>
          <Button disabled={form.isSubmitting} type="submit">
            {form.isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}
    </form>
  );
}
