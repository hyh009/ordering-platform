import type { FormEvent } from 'react';
import { supportedLocales, storeOrderTypes, storeCheckoutModes } from '@repo/shared';
import { Field } from '@/shared/components/form/Field';
import { LocalizedStringInput } from '@/shared/components/LocalizedStringInput';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/utils/cn';
import type { StoreFormVM } from './useStoreForm';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const LOCALE_LABELS: Record<string, string> = {
  'zh-TW': '繁體中文',
  en: 'English',
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Dine-in',
  takeaway: 'Takeaway',
};

const CHECKOUT_MODE_LABELS: Record<string, string> = {
  pay_first: 'Pay first',
  pay_later: 'Pay later',
};

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
                  {LOCALE_LABELS[locale]}
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
                      {LOCALE_LABELS[locale]}
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
                const mode = form.values.orderModes.find((m) => m.type === type);
                const enabled = mode?.isEnabled ?? false;
                return (
                  <div key={type} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{ORDER_TYPE_LABELS[type]}</span>
                      <button
                        aria-checked={enabled}
                        className={cn(
                          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none',
                          enabled ? 'bg-primary' : 'bg-muted',
                        )}
                        disabled={form.isSubmitting}
                        role="switch"
                        type="button"
                        onClick={() => form.setOrderMode(type, { isEnabled: !enabled })}
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
                        <span className="text-xs text-muted-foreground">Checkout:</span>
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
                            onClick={() => form.setOrderMode(type, { checkoutMode })}
                          >
                            {CHECKOUT_MODE_LABELS[checkoutMode]}
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
                  form.setField('serviceFeeRate', parseFloat(e.target.value) || 0)
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
                        <Input
                          aria-label={`${DAY_LABELS[hour.dayOfWeek]} open time`}
                          className="h-8 w-28"
                          disabled={!hour.isOpen || form.isSubmitting}
                          pattern="\d{2}:\d{2}"
                          placeholder="09:00"
                          type="time"
                          value={hour.openTime}
                          onChange={(e) =>
                            form.setBusinessHour(hour.dayOfWeek, {
                              openTime: e.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          aria-label={`${DAY_LABELS[hour.dayOfWeek]} close time`}
                          className="h-8 w-28"
                          disabled={!hour.isOpen || form.isSubmitting}
                          pattern="\d{2}:\d{2}"
                          placeholder="21:00"
                          type="time"
                          value={hour.closeTime}
                          onChange={(e) =>
                            form.setBusinessHour(hour.dayOfWeek, {
                              closeTime: e.target.value,
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
