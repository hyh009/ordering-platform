import { randomUUID } from 'node:crypto';

import { AllergenMongoModel } from '@src/models/allergen/mongo';

import type { AllergenEntity } from '@src/models/allergen/model';
import type {
  CreateAllergenInput,
  ListAllergensFilter,
  UpdateAllergenInput,
} from '@src/repositories/allergen/repository';

const allergenEntityKeyCoverage: Record<
  Exclude<
    keyof AllergenEntity,
    'id' | 'key' | 'name' | 'icon' | 'isActive' | 'createdAt' | 'updatedAt'
  >,
  never
> = {};

function toAllergenEntity(allergen: AllergenEntity): AllergenEntity {
  void allergenEntityKeyCoverage;

  return {
    id: allergen.id,
    key: allergen.key,
    name: allergen.name,
    ...(allergen.icon ? { icon: allergen.icon } : {}),
    isActive: allergen.isActive,
    createdAt: allergen.createdAt,
    updatedAt: allergen.updatedAt,
  };
}

function buildAllergenQuery(filter: ListAllergensFilter) {
  return typeof filter.isActive === 'boolean'
    ? { isActive: filter.isActive }
    : {};
}

export const allergenMongoRepository = {
  async list(filter: ListAllergensFilter) {
    const allergens = await AllergenMongoModel.find(buildAllergenQuery(filter))
      .sort({ key: 1 })
      .lean<AllergenEntity[]>()
      .exec();

    return allergens.map(toAllergenEntity);
  },

  async create(input: CreateAllergenInput) {
    const allergen = await AllergenMongoModel.create({
      id: `allergen-${randomUUID()}`,
      key: input.key.trim().toLowerCase(),
      name: input.name,
      ...(input.icon ? { icon: input.icon.trim() } : {}),
      isActive: input.isActive ?? true,
    });

    return toAllergenEntity(allergen.toObject());
  },

  async update(allergenId: string, input: UpdateAllergenInput) {
    const setUpdate: UpdateAllergenInput = {
      ...(input.name ? { name: input.name } : {}),
      ...(input.icon !== undefined && input.icon !== null
        ? { icon: input.icon.trim() }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    };
    const unsetUpdate = input.icon === null ? { icon: 1 } : undefined;

    const allergen = await AllergenMongoModel.findOneAndUpdate(
      { id: allergenId },
      {
        ...(Object.keys(setUpdate).length > 0 ? { $set: setUpdate } : {}),
        ...(unsetUpdate ? { $unset: unsetUpdate } : {}),
      },
      { new: true, runValidators: true },
    )
      .lean<AllergenEntity>()
      .exec();

    return allergen ? toAllergenEntity(allergen) : null;
  },
};
