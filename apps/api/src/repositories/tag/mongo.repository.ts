import { randomUUID } from 'node:crypto';

import { TagMongoModel } from '@src/models/tag/mongo';

import type { TagEntity } from '@src/models/tag/model';
import type {
  CreateTagInput,
  ListTagsByStoreInput,
  UpdateTagInput,
} from '@src/repositories/tag/repository';

const tagEntityKeys = [
  'id',
  'organizationId',
  'storeId',
  'name',
  'color',
  'displayOrder',
  'isActive',
  'createdAt',
  'updatedAt',
] as const satisfies readonly (keyof TagEntity)[];

const tagEntityKeyCoverage: Record<
  Exclude<keyof TagEntity, (typeof tagEntityKeys)[number]>,
  never
> = {};

function toTagEntity(doc: TagEntity): TagEntity {
  void tagEntityKeyCoverage;

  return Object.fromEntries(
    tagEntityKeys.map((key) => [key, doc[key]]),
  ) as TagEntity;
}

export const tagMongoRepository = {
  async create(input: CreateTagInput) {
    const doc = new TagMongoModel({
      id: `tag-${randomUUID()}`,
      organizationId: input.organizationId,
      storeId: input.storeId,
      name: input.name,
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });

    await doc.save();
    return toTagEntity(doc.toObject());
  },

  async findById(tagId: string) {
    const doc = await TagMongoModel.findOne({ id: tagId })
      .lean<TagEntity>()
      .exec();

    return doc ? toTagEntity(doc) : null;
  },

  async listByStore(input: ListTagsByStoreInput) {
    const filter: Record<string, unknown> = { storeId: input.storeId };
    if (input.isActive !== undefined) {
      filter.isActive = input.isActive;
    }

    const docs = await TagMongoModel.find(filter)
      .sort({ createdAt: 1, id: 1 })
      .lean<TagEntity[]>()
      .exec();

    return docs.map(toTagEntity);
  },

  async update(tagId: string, input: UpdateTagInput) {
    const update: Record<string, unknown> = {};

    const set = (path: string, value: unknown) => {
      if (value !== undefined) update[path] = value;
    };

    set('name', input.name);
    set('color', input.color);
    set('isActive', input.isActive);

    if (Object.keys(update).length === 0) {
      const existing = await TagMongoModel.findOne({ id: tagId })
        .lean<TagEntity>()
        .exec();
      return existing ? toTagEntity(existing) : null;
    }

    const doc = await TagMongoModel.findOneAndUpdate(
      { id: tagId },
      { $set: update },
      { new: true, runValidators: true },
    )
      .lean<TagEntity>()
      .exec();

    return doc ? toTagEntity(doc) : null;
  },
};
