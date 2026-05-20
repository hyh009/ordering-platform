import { randomUUID } from 'node:crypto';

import { DietaryMarkerMongoModel } from '@src/models/dietaryMarker/mongo';

import type { DietaryMarkerEntity } from '@src/models/dietaryMarker/model';
import type {
  CreateDietaryMarkerInput,
  ListDietaryMarkersFilter,
  UpdateDietaryMarkerInput,
} from '@src/repositories/dietaryMarker/repository';

function toDietaryMarkerEntity(
  dietaryMarker: DietaryMarkerEntity,
): DietaryMarkerEntity {
  return {
    id: dietaryMarker.id,
    key: dietaryMarker.key,
    name: dietaryMarker.name,
    ...(dietaryMarker.icon ? { icon: dietaryMarker.icon } : {}),
    type: dietaryMarker.type,
    isActive: dietaryMarker.isActive,
    createdAt: dietaryMarker.createdAt,
    updatedAt: dietaryMarker.updatedAt,
  };
}

function buildDietaryMarkerQuery(filter: ListDietaryMarkersFilter) {
  return typeof filter.isActive === 'boolean'
    ? { isActive: filter.isActive }
    : {};
}

export const dietaryMarkerMongoRepository = {
  async list(filter: ListDietaryMarkersFilter) {
    const dietaryMarkers = await DietaryMarkerMongoModel.find(
      buildDietaryMarkerQuery(filter),
    )
      .sort({ key: 1 })
      .lean<DietaryMarkerEntity[]>()
      .exec();

    return dietaryMarkers.map(toDietaryMarkerEntity);
  },

  async create(input: CreateDietaryMarkerInput) {
    const dietaryMarker = await DietaryMarkerMongoModel.create({
      id: `dietary-marker-${randomUUID()}`,
      key: input.key.trim().toLowerCase(),
      name: input.name,
      ...(input.icon ? { icon: input.icon.trim() } : {}),
      type: input.type,
      isActive: input.isActive ?? true,
    });

    return toDietaryMarkerEntity(dietaryMarker.toObject());
  },

  async update(dietaryMarkerId: string, input: UpdateDietaryMarkerInput) {
    const setUpdate: UpdateDietaryMarkerInput = {
      ...(input.name ? { name: input.name } : {}),
      ...(input.icon !== undefined && input.icon !== null
        ? { icon: input.icon.trim() }
        : {}),
      ...(input.type ? { type: input.type } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    };
    const unsetUpdate = input.icon === null ? { icon: 1 } : undefined;

    const dietaryMarker = await DietaryMarkerMongoModel.findOneAndUpdate(
      { id: dietaryMarkerId },
      {
        ...(Object.keys(setUpdate).length > 0 ? { $set: setUpdate } : {}),
        ...(unsetUpdate ? { $unset: unsetUpdate } : {}),
      },
      { new: true, runValidators: true },
    )
      .lean<DietaryMarkerEntity>()
      .exec();

    return dietaryMarker ? toDietaryMarkerEntity(dietaryMarker) : null;
  },
};
