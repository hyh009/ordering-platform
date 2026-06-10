import type { AllergenEntity } from './model';
import type { AllergenDto, PublicMetadataItemDto } from '@repo/shared';

export function toAllergenDto(allergen: AllergenEntity): AllergenDto {
  return {
    id: allergen.id,
    key: allergen.key,
    name: allergen.name,
    ...(allergen.icon ? { icon: allergen.icon } : {}),
    isActive: allergen.isActive,
  };
}

export function toPublicAllergenDto(
  allergen: AllergenEntity,
): PublicMetadataItemDto {
  return { id: allergen.id, name: allergen.name };
}
