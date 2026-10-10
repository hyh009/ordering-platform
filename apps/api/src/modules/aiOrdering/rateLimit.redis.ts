import { getRedisClient } from '@src/config/redis';

import type { AppRedisClient } from '@src/config/redis';
import type { AiOrderingRateLimiter } from '@src/modules/aiOrdering/rateLimit';

export type RedisAiOrderingRateLimiterOptions = {
  maxRequestsPerWindow: number;
  windowMs: number;
  /**
   * How long the in-flight lock survives without an explicit release.
   *
   * Only a crash recovery path: `release` runs in a `finally`, so the lock is
   * normally freed immediately. It has to outlast the slowest possible turn — two
   * model calls plus a summary rebuild — or a slow turn would free its own lock
   * and let a second request in. Too long and a crashed process locks that guest
   * out for the remainder.
   */
  lockTtlMs: number;
  /**
   * Resolved per call, not captured at construction: the service singleton is
   * built at import time, before startup has connected Redis.
   */
  getClient?: () => AppRedisClient;
};

const RATE_PREFIX = 'ai-ordering:rate:';
const LOCK_PREFIX = 'ai-ordering:inflight:';

/**
 * Request limiting backed by Redis, so the limits hold across API instances.
 *
 * Two independent guards, both keyed per guest participant:
 *
 * - a fixed window counter (`INCR`, with `PEXPIRE` set on first use)
 * - a single in-flight lock (`SET NX PX`, released with `DEL`)
 *
 * Order matters. The lock is taken BEFORE the counter is incremented, because a
 * request refused for concurrency must not consume rate budget — otherwise a
 * client firing parallel requests would burn the whole minute's allowance on
 * requests that were never served. When the counter then refuses, the lock this
 * call just took is released again.
 *
 * Both commands are individually atomic, which is what the guarantees rest on.
 * The pair is not transactional, but the only interaction between them is that
 * compensating release.
 *
 * Expiry is Redis' job here: the window key dies on its own, so there is no
 * sweep to maintain. That is the one thing the in-process implementation has to
 * do by hand.
 */
export function createRedisAiOrderingRateLimiter(
  options: RedisAiOrderingRateLimiterOptions,
): AiOrderingRateLimiter {
  const resolveClient = options.getClient ?? getRedisClient;

  return {
    async acquire(key: string) {
      const client = resolveClient();
      const lockKey = `${LOCK_PREFIX}${key}`;

      const lock = await client.set(lockKey, '1', {
        NX: true,
        PX: options.lockTtlMs,
      });

      if (lock === null) {
        return { allowed: false, reason: 'concurrent' };
      }

      const rateKey = `${RATE_PREFIX}${key}`;
      const used = await client.incr(rateKey);

      if (used === 1) {
        // First request of a window starts its clock. Setting it every time
        // would slide the window forward and never let it reset.
        await client.pExpire(rateKey, options.windowMs);
      }

      if (used > options.maxRequestsPerWindow) {
        await client.del(lockKey);

        return { allowed: false, reason: 'rate' };
      }

      return { allowed: true };
    },

    async release(key: string) {
      const client = resolveClient();

      await client.del(`${LOCK_PREFIX}${key}`);
    },
  };
}
