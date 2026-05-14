import mongoose from 'mongoose';
import { createClient } from 'redis';

import { env } from './env.js';
import { logger } from '../utils/logger.js';

const CONNECTION_TIMEOUT_MS = 5000;

export async function connectMongo() {
  logger.info('connecting to mongodb');

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: CONNECTION_TIMEOUT_MS,
  });

  logger.info('mongodb connected');
}

export async function connectRedis() {
  logger.info('connecting to redis');

  const redisClient = createClient({
    url: env.REDIS_URL,
    socket: {
      connectTimeout: CONNECTION_TIMEOUT_MS,
      reconnectStrategy: false,
    },
  });

  redisClient.on('error', (error) => {
    logger.error({ err: error }, 'redis error');
  });

  await redisClient.connect();

  logger.info('redis connected');

  return redisClient;
}
