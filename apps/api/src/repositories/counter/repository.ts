import { counterMongoRepository } from '@src/repositories/counter/mongo.repository';

export type CounterRepository = {
  nextDailyOrderSequence(
    storeId: string,
    businessDate: string,
  ): Promise<number>;
};

export const counterRepository: CounterRepository = counterMongoRepository;
