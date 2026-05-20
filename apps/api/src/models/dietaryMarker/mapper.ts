import type { DietaryMarkerEntity } from './model';
import type { DietaryMarkerDto } from '@repo/shared';

export function toDietaryMarkerDto(
  dietaryMarker: DietaryMarkerEntity,
): DietaryMarkerDto {
  return {
    id: dietaryMarker.id,
    key: dietaryMarker.key,
    name: dietaryMarker.name,
    ...(dietaryMarker.icon ? { icon: dietaryMarker.icon } : {}),
    type: dietaryMarker.type,
    isActive: dietaryMarker.isActive,
  };
}
