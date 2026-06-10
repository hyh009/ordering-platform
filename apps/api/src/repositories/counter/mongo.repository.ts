import { buildDailyOrderCounterId } from '@src/models/counter/model';
import { CounterMongoModel } from '@src/models/counter/mongo';

import type { CounterEntity } from '@src/models/counter/model';

export const counterMongoRepository = {
  async nextDailyOrderSequence(storeId: string, businessDate: string) {
    const doc = await CounterMongoModel.findOneAndUpdate(
      { _id: buildDailyOrderCounterId(storeId, businessDate) },
      {
        $inc: { sequence: 1 },
        $setOnInsert: {
          scope: 'order_daily_sequence',
          storeId,
          businessDate,
        },
      },
      { new: true, upsert: true },
    )
      .lean<CounterEntity>()
      .exec();

    return doc.sequence;
  },
};
