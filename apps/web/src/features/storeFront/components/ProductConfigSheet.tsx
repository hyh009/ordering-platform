import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import type { AddCartItemRequest, UpdateCartItemRequest } from '@/models/cart';
import type { PublicModifier, PublicProduct } from '@/models/storeFrontMenu';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { formatPrice } from '@/shared/utils/money';
import { AllergenDisplay } from './AllergenDisplay';
import { useLocalizedText } from './useLocalizedText';
import {
  isModifierSatisfied,
  orderModifiersRequiredFirst,
  useProductConfig,
} from './useProductConfig';
import type { ProductConfigInitial } from './useProductConfig';

type ProductConfigSheetProps = {
  product: PublicProduct;
  modifiers: PublicModifier[];
  allergens?: string[];
  isMutating: boolean;
  onClose: () => void;
} & (
  | {
      /** Configuring a product on its way into the cart. */
      editing?: undefined;
      onConfirm: (request: AddCartItemRequest) => void;
    }
  | {
      /**
       * Changing an item already in the cart: the sheet opens on what the item
       * holds and saves an update to it.
       */
      editing: ProductConfigInitial;
      onConfirm: (request: UpdateCartItemRequest) => void;
    }
);

/**
 * The option picker, for a product being added and for a cart item being
 * changed.
 *
 * Adding lists every choice, because none has been made yet. Changing shows the
 * choices the item already has as text and opens ONE of them at a time, the way
 * the assistant's proposal card does — the guest came to fix one thing, and a
 * wall of every option the product has is not that.
 */
export function ProductConfigSheet(props: ProductConfigSheetProps) {
  const { product, modifiers, allergens = [], isMutating, onClose } = props;
  const { tDefault } = useAppTranslation();
  const localize = useLocalizedText();
  const config = useProductConfig(product, modifiers, props.editing);
  const isEditing = props.editing !== undefined;
  const imageSrc = product.imageUrls[0];

  const ordered = orderModifiersRequiredFirst(modifiers);
  const firstUnsatisfied = (skipId?: string) =>
    ordered.find(
      (modifier) =>
        modifier.id !== skipId &&
        !isModifierSatisfied(modifier, config.selection[modifier.id]),
    )?.id ?? null;

  // Which choice is open while editing. A choice the item can no longer satisfy
  // — its option sold out since — opens by itself, so the guest is shown what
  // needs an answer instead of a disabled save button.
  const [openModifierId, setOpenModifierId] = useState<string | null>(() =>
    isEditing ? firstUnsatisfied() : null,
  );
  const openModifier =
    ordered.find((modifier) => modifier.id === openModifierId) ?? null;

  function renderOptions(modifier: PublicModifier, onPicked?: () => void) {
    return (
      <div className="mt-2 space-y-1">
        {modifier.options.map((option) => {
          const selected =
            config.selection[modifier.id]?.includes(option.id) ?? false;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              disabled={option.isSoldOut}
              onClick={() => {
                config.toggleOption(modifier, option.id);
                onPicked?.();
              }}
              className={`flex w-full items-center justify-between rounded-md border p-2 text-left text-sm disabled:opacity-50 ${
                selected ? 'border-primary bg-primary/10' : 'border-border'
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
    );
  }

  function renderRequirement(modifier: PublicModifier) {
    return (
      <span className="ml-2 text-xs font-normal text-muted-foreground">
        {modifier.minSelect > 0
          ? tDefault('guest.menu.required', 'Required')
          : tDefault('guest.menu.optional', 'Optional')}
      </span>
    );
  }

  function renderChoiceChips() {
    return (
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {ordered.map((modifier) => {
          const selected = config.selection[modifier.id] ?? [];
          const labels = modifier.options
            .filter((option) => selected.includes(option.id))
            .map((option) => localize(option.name));
          const isOpen = modifier.id === openModifierId;
          const isMissing = !isModifierSatisfied(modifier, selected);
          const text = tDefault(
            'guest.assistant.choiceValue',
            '{{label}}: {{value}}',
            {
              label: localize(modifier.name),
              value:
                labels.length > 0
                  ? labels.join(' / ')
                  : isMissing
                    ? tDefault('guest.cart.choiceMissing', 'Choose')
                    : tDefault('guest.assistant.choiceNone', 'None'),
            },
          );

          return (
            <li key={modifier.id}>
              <button
                type="button"
                aria-pressed={isOpen}
                aria-label={tDefault(
                  'guest.assistant.changeChoice',
                  'Change {{choice}}',
                  { choice: text },
                )}
                className={
                  isOpen
                    ? 'flex items-center gap-1 rounded-full border border-storefront-primary px-2.5 py-1 text-xs text-storefront-primary'
                    : isMissing
                      ? 'flex items-center gap-1 rounded-full border border-destructive px-2.5 py-1 text-xs text-destructive'
                      : 'flex items-center gap-1 rounded-full border border-storefront-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted'
                }
                onClick={() => {
                  setOpenModifierId(isOpen ? null : modifier.id);
                }}
              >
                {text}
                <Pencil size={10} strokeWidth={2} />
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  function renderOpenChoice(modifier: PublicModifier) {
    const isMultiSelect = modifier.selectionType !== 'single_choice';
    const selected = config.selection[modifier.id] ?? [];
    // Answering one choice moves on to the next one that still needs an answer,
    // and closes the picker when none does.
    const moveOn = () => {
      setOpenModifierId(firstUnsatisfied(modifier.id));
    };

    return (
      <section className="mt-3 border-t border-storefront-border pt-3">
        <h3 className="text-sm font-semibold">
          {localize(modifier.name)}
          {renderRequirement(modifier)}
          {isMultiSelect ? (
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {tDefault('guest.assistant.choiceMax', 'up to {{count}}', {
                count: modifier.maxSelect,
              })}
            </span>
          ) : null}
        </h3>

        {/* One answer is given by the tap. Several are toggled and confirmed,
            because a tap cannot say whether the guest is finished. */}
        {renderOptions(modifier, isMultiSelect ? undefined : moveOn)}

        <div className="mt-2 flex justify-end gap-2">
          {!isMultiSelect && modifier.minSelect === 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                config.clearModifier(modifier);
                moveOn();
              }}
            >
              {tDefault('guest.assistant.declineChoice', 'No thanks')}
            </Button>
          ) : null}
          {isMultiSelect ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!isModifierSatisfied(modifier, selected)}
              onClick={moveOn}
            >
              {selected.length === 0 && modifier.minSelect === 0
                ? tDefault('guest.assistant.declineChoice', 'No thanks')
                : tDefault('guest.assistant.confirmChoice', 'Done')}
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <div className="fixed inset-0 z-page-modal flex flex-col justify-end lg:items-center lg:justify-center">
      <button
        type="button"
        aria-label={tDefault('common.close', 'Close')}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div className="relative flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-background lg:mx-auto lg:max-w-lg lg:rounded-2xl lg:shadow-xl">
        <div className="flex-1 overflow-y-auto p-4">
          {/* The photo, for a product being added: this is where a card that
              has no room for one sends the guest to see it. Left out while
              editing, like the description — that sheet opens on one choice the
              guest came to fix, not on the product again. */}
          {imageSrc && !isEditing ? (
            <img
              src={imageSrc}
              alt={localize(product.name)}
              className="mb-3 aspect-[3/2] w-full rounded-xl bg-storefront-border object-cover"
            />
          ) : null}
          <h2 className="text-lg font-bold">{localize(product.name)}</h2>
          {product.description && !isEditing ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {localize(product.description)}
            </p>
          ) : null}
          <AllergenDisplay allergens={allergens} />

          {isEditing ? (
            <>
              {ordered.length > 0 ? renderChoiceChips() : null}
              {openModifier ? renderOpenChoice(openModifier) : null}
            </>
          ) : (
            modifiers.map((modifier) => (
              <section key={modifier.id} className="mt-4">
                <h3 className="text-sm font-semibold">
                  {localize(modifier.name)}
                  {renderRequirement(modifier)}
                </h3>
                {renderOptions(modifier)}
              </section>
            ))
          )}

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
            onClick={() => {
              if (props.editing !== undefined) {
                props.onConfirm(config.buildUpdateRequest());
              } else {
                props.onConfirm(config.buildRequest());
              }
            }}
          >
            {isEditing
              ? tDefault('guest.cart.saveItemChanges', 'Save changes')
              : tDefault('guest.menu.addToCart', 'Add to cart')}{' '}
            · {formatPrice(config.unitPrice * config.quantity)}
          </Button>
        </div>
      </div>
    </div>
  );
}
