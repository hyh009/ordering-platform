import { randomUUID } from 'node:crypto';

import { StoreMongoModel } from '@src/models/store/mongo';

import type { StoreEntity } from '@src/models/store/model';
import type {
  CreateStoreInput,
  ListStoresByOrganizationInput,
  UpdateStoreInput,
} from '@src/repositories/store/repository';

function toStoreEntity(doc: StoreEntity): StoreEntity {
  return {
    id: doc.id,
    organizationId: doc.organizationId,
    profile: doc.profile,
    locale: doc.locale,
    operation: doc.operation,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const storeMongoRepository = {
  async create(input: CreateStoreInput) {
    const doc = new StoreMongoModel({
      id: `store-${randomUUID()}`,
      organizationId: input.organizationId,
      profile: input.profile,
      locale: input.locale,
      operation: input.operation,
      status: 'active',
    });

    await doc.save();
    return toStoreEntity(doc.toObject());
  },

  async findById(storeId: string) {
    const doc = await StoreMongoModel.findOne({ id: storeId })
      .lean<StoreEntity>()
      .exec();

    return doc ? toStoreEntity(doc) : null;
  },

  async listByOrganization(input: ListStoresByOrganizationInput) {
    const filter = { organizationId: input.organizationId };
    const sort = { createdAt: 1 as const, id: 1 as const };

    const [docs, total] = await Promise.all([
      StoreMongoModel.find(filter)
        .sort(sort)
        .skip(input.offset)
        .limit(input.limit)
        .lean<StoreEntity[]>()
        .exec(),
      StoreMongoModel.countDocuments(filter).exec(),
    ]);

    return {
      stores: docs.map(toStoreEntity),
      total,
    };
  },

  async update(storeId: string, input: UpdateStoreInput) {
    const update: Record<string, unknown> = {};

    const set = (path: string, value: unknown) => {
      if (value !== undefined) update[path] = value;
    };

    set('profile.displayName', input.profile?.displayName);
    set('profile.description', input.profile?.description);

    set('locale.defaultLocale', input.locale?.defaultLocale);
    set('locale.supportedLocales', input.locale?.supportedLocales);

    set('operation.businessHours', input.operation?.businessHours);
    set('operation.serviceFeeRate', input.operation?.serviceFeeRate);
    set('operation.orderModes', input.operation?.orderModes);

    set('status', input.status);

    if (Object.keys(update).length === 0) {
      const existing = await StoreMongoModel.findOne({ id: storeId })
        .lean<StoreEntity>()
        .exec();
      return existing ? toStoreEntity(existing) : null;
    }

    const doc = await StoreMongoModel.findOneAndUpdate(
      { id: storeId },
      { $set: update },
      { new: true, runValidators: true },
    )
      .lean<StoreEntity>()
      .exec();

    return doc ? toStoreEntity(doc) : null;
  },
};
