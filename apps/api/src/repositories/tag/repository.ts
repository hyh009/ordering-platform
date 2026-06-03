import { tagMongoRepository } from '@src/repositories/tag/mongo.repository';

import type { LocalizedString } from '@src/models/common/model';
import type { TagEntity } from '@src/models/tag/model';

export type CreateTagInput = {
  organizationId: string;
  storeId: string;
  name: LocalizedString;
  color?: string | undefined;
  isActive?: boolean | undefined;
};

export type ListTagsByStoreInput = {
  storeId: string;
  isActive?: boolean | undefined;
};

export type UpdateTagInput = {
  name?: LocalizedString | undefined;
  color?: string | undefined;
  isActive?: boolean | undefined;
};

export type TagRepository = {
  create(input: CreateTagInput): Promise<TagEntity>;
  findById(tagId: string): Promise<TagEntity | null>;
  listByStore(input: ListTagsByStoreInput): Promise<TagEntity[]>;
  update(tagId: string, input: UpdateTagInput): Promise<TagEntity | null>;
};

export const tagRepository: TagRepository = tagMongoRepository;
