import type { AllergenEntity } from './model';
import type { AllergenDto } from '@repo/shared';

export function toAllergenDto(allergen: AllergenEntity): AllergenDto {
  return {
    id: allergen.id,
    key: allergen.key,
    name: allergen.name,
    ...(allergen.icon ? { icon: allergen.icon } : {}),
    isActive: allergen.isActive,
  };
}
