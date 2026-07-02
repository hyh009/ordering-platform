import type {
  PublicMetadataItem,
  PublicModifier,
  PublicTag,
} from './types';

// Menu grouping/ordering is done server-side; the public menu already arrives
// as ordered `groups`. These builders index the flat reference collections
// (modifiers/tags/allergens) that products point at by id.

export function buildModifierMap(
  modifiers: PublicModifier[],
): Map<string, PublicModifier> {
  return new Map(modifiers.map((modifier) => [modifier.id, modifier]));
}

export function buildTagMap(tags: PublicTag[]): Map<string, PublicTag> {
  return new Map(tags.map((tag) => [tag.id, tag]));
}

export function buildAllergenMap(
  allergens: PublicMetadataItem[],
): Map<string, PublicMetadataItem> {
  return new Map(allergens.map((allergen) => [allergen.id, allergen]));
}
