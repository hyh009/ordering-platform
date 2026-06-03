import type { TagEntity } from './model';
import type { TagDto } from '@repo/shared';

export function toTagDto(tag: TagEntity): TagDto {
  const dto: TagDto = {
    id: tag.id,
    storeId: tag.storeId,
    name: tag.name,
    isActive: tag.isActive,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  };

  if (tag.color !== undefined) {
    dto.color = tag.color;
  }

  return dto;
}
