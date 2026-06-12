import { randomUUID } from 'node:crypto';

import { StoreMongoModel } from '@src/models/store/mongo';

import type { StoreEntity } from '@src/models/store/model';
import type {
  CreateStoreInput,
  ListStoresByOrganizationInput,
  UpdateStoreInput,
} from '@src/repositories/store/repository';

const storeEntityKeys = [
  'id',
  'organizationId',
  'profile',
  'locale',
  'operation',
  'status',
  'createdAt',
  'updatedAt',
] as const satisfies readonly (keyof StoreEntity)[];

const storeEntityKeyCoverage: Record<
  Exclude<keyof StoreEntity, (typeof storeEntityKeys)[number]>,
  never
> = {};

function toStoreEntity(doc: StoreEntity): StoreEntity {
  void storeEntityKeyCoverage;

  return Object.fromEntries(
    storeEntityKeys.map((key) => [key, doc[key]]),
  ) as StoreEntity;
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
    // Use findOne + save so that validators run on the full document.
    // findOneAndUpdate with runValidators: true does not bind `this` to the
    // document in subdocument validators, causing cross-field checks like
    // "supportedLocales must include defaultLocale" to always fail.
    const doc = await StoreMongoModel.findOne({ id: storeId }).exec();
    if (!doc) return null;

    if (input.profile?.displayName !== undefined) doc.profile.displayName = input.profile.displayName;
    if (input.profile?.description !== undefined) doc.profile.description = input.profile.description;

    if (input.locale?.defaultLocale !== undefined) doc.locale.defaultLocale = input.locale.defaultLocale;
    if (input.locale?.supportedLocales !== undefined) doc.locale.supportedLocales = input.locale.supportedLocales;

    if (input.operation?.businessHours !== undefined) doc.operation.businessHours = input.operation.businessHours;
    if (input.operation?.serviceFeeRate !== undefined) doc.operation.serviceFeeRate = input.operation.serviceFeeRate;
    if (input.operation?.orderModes !== undefined) doc.operation.orderModes = input.operation.orderModes;

    if (input.status !== undefined) doc.status = input.status;

    await doc.save();
    return toStoreEntity(doc.toObject());
  },
};
