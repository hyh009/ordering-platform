import type { Tag, TagDto } from './types';

export const tagModel = {
  deserialize(dto: TagDto): Tag {
    const tag: Tag = {
      id: dto.id,
      storeId: dto.storeId,
      name: dto.name,
      isActive: dto.isActive,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };

    if (dto.color !== undefined) {
      tag.color = dto.color;
    }

    return tag;
  },
};

export function getTagName(name: TagDto['name']): string {
  return name['zh-TW'] ?? name.en ?? '';
}
