import type { SupportedLocale } from '@/models/metadata';
import { getLocalizedText } from '@/models/metadata';
import type { ProductModifier } from '@/models/productModifier';
import type { MultiSelectOption } from '@/shared/components/form/MultiSelect';

export function toOptions(
  items: { id: string; name: Parameters<typeof getLocalizedText>[0] }[],
  locale: SupportedLocale,
): MultiSelectOption[] {
  return items.map((item) => ({
    label: getLocalizedText(item.name, locale),
    value: item.id,
  }));
}

export function buildModifiersById(
  modifiers: ProductModifier[],
): Map<string, ProductModifier> {
  return new Map(modifiers.map((modifier) => [modifier.id, modifier]));
}
