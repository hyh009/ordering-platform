import type { TagEntity } from './model';
import type { PublicTagDto, TagDto } from '@repo/shared';

export function toPublicTagDto(tag: TagEntity): PublicTagDto {
  return {
    id: tag.id,
    name: tag.name,
    ...(tag.color !== undefined ? { color: tag.color } : {}),
  };
}

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
