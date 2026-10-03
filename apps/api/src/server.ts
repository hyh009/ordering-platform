import { createServer } from 'node:http';

import mongoose from 'mongoose';

import { createApp } from './app.js';
import { connectMongo, connectRedis } from './config/db.js';
import { env } from './config/env.js';
import { setRedisClient } from './config/redis.js';
import { closeAiOrderingCheckpointer } from './modules/aiOrdering/runtime/checkpointer.js';
import { logger } from './utils/logger.js';

let server: ReturnType<typeof createServer>;

async function bootstrap() {
  await connectMongo();
  const redisClient = await connectRedis();

  // Published for module singletons that resolve it lazily, such as the AI
  // ordering rate limiter.
  setRedisClient(redisClient);

  const app = createApp();
  server = createServer(app);

  const port = env.PORT;

  server.listen(port, () => {
    logger.info({ port }, 'server started');
  });

  // If you don't need WebSocket, you can simplify to:
  // const app = createApp();
  // app.listen(port, () => {
  //   logger.info({ port }, 'server started');
  // });

  // graceful shutdown
  const shutdown = async () => {
    logger.info('shutting down');

    await mongoose.connection.close();
    await redisClient.quit();
    // Opened lazily, and only when the assistant is enabled; closing a
    // checkpointer that was never created is a no-op.
    await closeAiOrderingCheckpointer();

    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((error: unknown) => {
  logger.error({ err: error }, 'failed to start server');
  process.exit(1);
});
