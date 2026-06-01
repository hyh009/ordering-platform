import type { StoreDto } from '@repo/shared';
import type { Store } from './types';

export const storeModel = {
  deserialize(dto: StoreDto): Store {
    return {
      id: dto.id,
      organizationId: dto.organizationId,
      profile: dto.profile,
      locale: dto.locale,
      operation: dto.operation,
      status: dto.status,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };
  },
};
