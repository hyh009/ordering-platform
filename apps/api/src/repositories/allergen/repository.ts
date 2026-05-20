import { allergenMongoRepository } from '@src/repositories/allergen/mongo.repository';

import type { AllergenEntity } from '@src/models/allergen/model';
import type { LocalizedString } from '@src/models/common/model';

export type ListAllergensFilter = {
  isActive?: boolean | undefined;
};

export type CreateAllergenInput = {
  key: string;
  name: LocalizedString;
  icon?: string | undefined;
  isActive?: boolean | undefined;
};

export type UpdateAllergenInput = {
  name?: LocalizedString | undefined;
  icon?: string | null | undefined;
  isActive?: boolean | undefined;
};

export type AllergenRepository = {
  list(filter: ListAllergensFilter): Promise<AllergenEntity[]>;
  create(input: CreateAllergenInput): Promise<AllergenEntity>;
  update(
    allergenId: string,
    input: UpdateAllergenInput,
  ): Promise<AllergenEntity | null>;
};

export const allergenRepository: AllergenRepository = allergenMongoRepository;
