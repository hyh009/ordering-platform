import { useAppTranslation } from '@/app/i18n';
import { AllergenDisplay } from '@/features/storeFront/components/AllergenDisplay';
import { useLocalizedText } from '@/features/storeFront/components/useLocalizedText';
import type { AddCartItemRequest } from '@/models/cart';
import type { PublicModifier, PublicProduct } from '@/models/storeFrontMenu';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { formatPrice } from '@/shared/utils/money';
import { useProductConfig } from './useProductConfig';

type ProductConfigSheetProps = {
  product: PublicProduct;
  modifiers: PublicModifier[];
  allergens: string[];
  isMutating: boolean;
  onClose: () => void;
  onConfirm: (request: AddCartItemRequest) => void;
};

export function ProductConfigSheet({
  product,
  modifiers,
  allergens,
  isMutating,
  onClose,
  onConfirm,
}: ProductConfigSheetProps) {
  const { tDefault } = useAppTranslation();
  const localize = useLocalizedText();
  const config = useProductConfig(product, modifiers);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end lg:items-center lg:justify-center">
      <button
        type="button"
        aria-label={tDefault('common.close', 'Close')}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div className="relative flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-background lg:mx-auto lg:max-w-lg lg:rounded-2xl lg:shadow-xl">
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-lg font-bold">{localize(product.name)}</h2>
          {product.description ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {localize(product.description)}
            </p>
          ) : null}
          <AllergenDisplay allergens={allergens} />

          {modifiers.map((modifier) => (
            <section key={modifier.id} className="mt-4">
              <h3 className="text-sm font-semibold">
                {localize(modifier.name)}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {modifier.minSelect > 0
                    ? tDefault('guest.menu.required', 'Required')
                    : tDefault('guest.menu.optional', 'Optional')}
                </span>
              </h3>
              <div className="mt-2 space-y-1">
                {modifier.options.map((option) => {
                  const selected =
                    config.selection[modifier.id]?.includes(option.id) ?? false;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={option.isSoldOut}
                      onClick={() => config.toggleOption(modifier, option.id)}
                      className={`flex w-full items-center justify-between rounded-md border p-2 text-left text-sm disabled:opacity-50 ${
                        selected
                          ? 'border-primary bg-primary/10'
                          : 'border-border'
                      }`}
                    >
                      <span>{localize(option.name)}</span>
                      <span className="text-muted-foreground">
                        {option.priceAdjustment !== 0
                          ? `+${formatPrice(option.priceAdjustment)}`
                          : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          <section className="mt-4">
            <label className="text-sm font-semibold" htmlFor="item-notes">
              {tDefault('guest.menu.notes', 'Notes')}
            </label>
            <Textarea
              id="item-notes"
              className="mt-2"
              maxLength={500}
              value={config.notes}
              placeholder={tDefault(
                'guest.menu.notesPlaceholder',
                'e.g. no onions',
              )}
              onChange={(event) => config.setNotes(event.target.value)}
            />
          </section>

          <div className="mt-4 flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              disabled={config.quantity <= 1}
              onClick={() => config.setQuantity(config.quantity - 1)}
            >
              −
            </Button>
            <span className="w-8 text-center text-lg font-semibold">
              {config.quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={config.quantity >= 99}
              onClick={() => config.setQuantity(config.quantity + 1)}
            >
              +
            </Button>
          </div>
        </div>

        <div className="border-t border-border p-4">
          <Button
            variant="storefront"
            className="w-full"
            disabled={!config.isValid || isMutating}
            onClick={() => onConfirm(config.buildRequest())}
          >
            {tDefault('guest.menu.addToCart', 'Add to cart')} ·{' '}
            {formatPrice(config.unitPrice * config.quantity)}
          </Button>
        </div>
      </div>
    </div>
  );
}
