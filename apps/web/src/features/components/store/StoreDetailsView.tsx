import type { ReactNode } from 'react';
import { useAppTranslation } from '@/app/i18n';
import { getSupportedCustomerLocaleLabel } from '@/models/metadata';
import {
  getStoreCheckoutModeLabel,
  getStoreOrderTypeLabel,
  storeOrderTypes,
  type Store,
} from '@/models/store';
import { LocalizedStringView } from '@/shared/components/LocalizedStringView';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type StoreDetailsViewProps = {
  store: Store;
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[12rem_1fr] gap-4 py-1.5">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{children}</span>
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h4 className="border-b border-border pb-2 text-sm font-semibold">
      {children}
    </h4>
  );
}

export function StoreDetailsView({ store }: StoreDetailsViewProps) {
  const { tDefault } = useAppTranslation();
  const { locale, profile, operation } = store;
  const defaultLocale = locale.defaultLocale;

  return (
    <div className="grid gap-8">
      {/* Locale */}
      <section className="grid gap-4">
        <SectionHeading>Locale</SectionHeading>
        <div className="grid">
          <Row label="Default locale">
            {getSupportedCustomerLocaleLabel(defaultLocale, tDefault)}
          </Row>
          <Row label="Supported locales">
            {locale.supportedLocales
              .map((l) => getSupportedCustomerLocaleLabel(l, tDefault))
              .join(', ')}
          </Row>
        </div>
      </section>

      {/* Profile */}
      <section className="grid gap-4">
        <SectionHeading>Profile</SectionHeading>
        <div className="grid">
          <Row label="Display name">
            <LocalizedStringView
              highlightLocale={defaultLocale}
              value={profile.displayName}
            />
          </Row>
          <Row label="Description">
            <LocalizedStringView
              highlightLocale={defaultLocale}
              value={profile.description ?? {}}
            />
          </Row>
        </div>
      </section>

      {/* Operation */}
      <section className="grid gap-4">
        <SectionHeading>Operation</SectionHeading>
        <div className="grid">
          <Row label="Order modes">
            <div className="grid gap-1">
              {storeOrderTypes.map((type) => {
                const mode = operation.orderModes.find((m) => m.type === type);
                const enabled = mode?.isEnabled ?? false;
                return (
                  <span key={type}>
                    {getStoreOrderTypeLabel(type, tDefault)}
                    {': '}
                    {enabled && mode ? (
                      getStoreCheckoutModeLabel(mode.checkoutMode, tDefault)
                    ) : (
                      <span className="text-muted-foreground">Off</span>
                    )}
                  </span>
                );
              })}
            </div>
          </Row>
          <Row label="Service fee rate">
            {Math.round(operation.serviceFeeRate * 100)}%
          </Row>
          <Row label="Business hours">
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {operation.businessHours.map((hour) => (
                    <tr key={hour.dayOfWeek}>
                      <td className="px-4 py-2 font-medium">
                        {DAY_LABELS[hour.dayOfWeek]}
                      </td>
                      <td className="px-4 py-2">
                        {hour.isOpen ? (
                          `${hour.openTime ?? '—'} – ${hour.closeTime ?? '—'}`
                        ) : (
                          <span className="text-muted-foreground">Closed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Row>
        </div>
      </section>
    </div>
  );
}
