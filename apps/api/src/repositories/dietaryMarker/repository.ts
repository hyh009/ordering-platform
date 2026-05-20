import { dietaryMarkerMongoRepository } from '@src/repositories/dietaryMarker/mongo.repository';

import type { LocalizedString } from '@src/models/common/model';
import type {
  DietaryMarkerEntity,
  DietaryMarkerType,
} from '@src/models/dietaryMarker/model';

export type ListDietaryMarkersFilter = {
  isActive?: boolean | undefined;
};

export type CreateDietaryMarkerInput = {
  key: string;
  name: LocalizedString;
  icon?: string | undefined;
  type: DietaryMarkerType;
  isActive?: boolean | undefined;
};

export type UpdateDietaryMarkerInput = {
  name?: LocalizedString | undefined;
  icon?: string | null | undefined;
  type?: DietaryMarkerType | undefined;
  isActive?: boolean | undefined;
};

export type DietaryMarkerRepository = {
  list(filter: ListDietaryMarkersFilter): Promise<DietaryMarkerEntity[]>;
  create(input: CreateDietaryMarkerInput): Promise<DietaryMarkerEntity>;
  update(
    dietaryMarkerId: string,
    input: UpdateDietaryMarkerInput,
  ): Promise<DietaryMarkerEntity | null>;
};

export const dietaryMarkerRepository: DietaryMarkerRepository =
  dietaryMarkerMongoRepository;
