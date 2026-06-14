import { ShoppingBag, Users } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import {
  getStoreOrderTypeDescription,
  getStoreOrderTypeLabel,
  type StoreOrderType,
} from '@/models/store';

type OrderTypeSelectorProps = {
  availableTypes: StoreOrderType[];
  value: StoreOrderType | null;
  disabled?: boolean;
  onChange: (type: StoreOrderType) => void;
};

export function OrderTypeSelector({
  availableTypes,
  value,
  disabled = false,
  onChange,
}: OrderTypeSelectorProps) {
  const { tDefault } = useAppTranslation();

  return (
    <div
      className={`grid gap-3 ${
        availableTypes.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
      }`}
    >
      {availableTypes.map((type) => {
        const selected = value === type;
        return (
          <button
            key={type}
            aria-pressed={selected}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-5 transition ${
              selected
                ? 'border-storefront-primary bg-storefront-primary/10'
                : 'border-storefront-border bg-storefront-bg hover:border-storefront-primary/50'
            }`}
            disabled={disabled}
            type="button"
            onClick={() => onChange(type)}
          >
            {type === 'dine_in' ? (
              <Users className="h-8 w-8 text-storefront-text-muted" />
            ) : (
              <ShoppingBag className="h-8 w-8 text-storefront-text-muted" />
            )}
            <span className="font-semibold text-storefront-text">
              {getStoreOrderTypeLabel(type, tDefault)}
            </span>
            <span className="text-xs text-storefront-text-muted">
              {getStoreOrderTypeDescription(type, tDefault)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
