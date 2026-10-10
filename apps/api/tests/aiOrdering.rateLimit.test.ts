import { describe, expect, it, vi } from 'vitest';

import { createInMemoryAiOrderingRateLimiter } from '../src/modules/aiOrdering/rateLimit.js';
import { createRedisAiOrderingRateLimiter } from '../src/modules/aiOrdering/rateLimit.redis.js';

import type { AppRedisClient } from '../src/config/redis.js';

const KEY = 'store-1:cart-1:participant-self';

function fakeRedis() {
  const counters = new Map<string, number>();
  const locks = new Set<string>();
  const calls: string[] = [];

  const client: AppRedisClient = {
    incr: vi.fn(async (key: string) => {
      calls.push(`incr ${key}`);
      const next = (counters.get(key) ?? 0) + 1;
      counters.set(key, next);
      return next;
    }),
    pExpire: vi.fn(async (key: string, ms: number) => {
      calls.push(`pexpire ${key} ${ms}`);
      return 1;
    }),
    set: vi.fn(async (key: string) => {
      calls.push(`set ${key}`);

      if (locks.has(key)) {
        return null;
      }

      locks.add(key);
      return 'OK';
    }),
    del: vi.fn(async (key: string) => {
      calls.push(`del ${key}`);
      locks.delete(key);
      return 1;
    }),
  };

  return { client, calls, counters, locks };
}

function limiter(redis: ReturnType<typeof fakeRedis>, max = 3) {
  return createRedisAiOrderingRateLimiter({
    maxRequestsPerWindow: max,
    windowMs: 60_000,
    lockTtlMs: 90_000,
    getClient: () => redis.client,
  });
}

describe('Redis AI ordering rate limiter', () => {
  it('allows a request and holds an in-flight lock', async () => {
    const redis = fakeRedis();
    const subject = limiter(redis);

    expect(await subject.acquire(KEY)).toEqual({ allowed: true });
    expect(redis.locks.has(`ai-ordering:inflight:${KEY}`)).toBe(true);
  });

  it('refuses a second request while one is in flight', async () => {
    const redis = fakeRedis();
    const subject = limiter(redis);

    await subject.acquire(KEY);

    expect(await subject.acquire(KEY)).toEqual({
      allowed: false,
      reason: 'concurrent',
    });
  });

  it('takes the lock before counting, so a refused request costs no budget', async () => {
    const redis = fakeRedis();
    const subject = limiter(redis);

    await subject.acquire(KEY);
    await subject.acquire(KEY); // refused for concurrency

    // Otherwise a client firing parallel requests would burn the whole minute's
    // allowance on requests that were never served.
    expect(redis.counters.get(`ai-ordering:rate:${KEY}`)).toBe(1);
  });

  it('starts the window clock only on the first request of a window', async () => {
    const redis = fakeRedis();
    const subject = limiter(redis);

    await subject.acquire(KEY);
    await subject.release(KEY);
    await subject.acquire(KEY);

    // Re-setting the expiry every time would slide the window forward and it
    // would never reset.
    const expiries = redis.calls.filter((call) => call.startsWith('pexpire'));

    expect(expiries).toHaveLength(1);
    expect(expiries[0]).toContain('60000');
  });

  it('refuses past the window allowance', async () => {
    const redis = fakeRedis();
    const subject = limiter(redis, 3);

    for (let index = 0; index < 3; index += 1) {
      expect(await subject.acquire(KEY)).toEqual({ allowed: true });
      await subject.release(KEY);
    }

    expect(await subject.acquire(KEY)).toEqual({
      allowed: false,
      reason: 'rate',
    });
  });

  it('releases the lock it just took when the rate check refuses', async () => {
    const redis = fakeRedis();
    const subject = limiter(redis, 1);

    await subject.acquire(KEY);
    await subject.release(KEY);
    await subject.acquire(KEY); // refused for rate

    // A lock left behind here would turn a rate refusal into a permanent one.
    expect(redis.locks.has(`ai-ordering:inflight:${KEY}`)).toBe(false);
  });

  it('keys each guest participant separately', async () => {
    const redis = fakeRedis();
    const subject = limiter(redis, 1);

    await subject.acquire('store-1:cart-1:participant-a');

    // Sharing a cart must not mean sharing an allowance: the cost is per person.
    expect(await subject.acquire('store-1:cart-1:participant-b')).toEqual({
      allowed: true,
    });
  });

  it('resolves the client per call, not at construction', async () => {
    const redis = fakeRedis();
    const getClient = vi.fn(() => redis.client);

    const subject = createRedisAiOrderingRateLimiter({
      maxRequestsPerWindow: 3,
      windowMs: 60_000,
      lockTtlMs: 90_000,
      getClient,
    });

    // The service singleton is constructed at import time, before startup has
    // connected Redis, so capturing the client eagerly would throw on boot.
    expect(getClient).not.toHaveBeenCalled();

    await subject.acquire(KEY);

    expect(getClient).toHaveBeenCalled();
  });
});

describe('In-process AI ordering rate limiter', () => {
  it('still exists for unit tests that must not need Redis', async () => {
    const subject = createInMemoryAiOrderingRateLimiter({
      maxRequestsPerWindow: 1,
      windowMs: 60_000,
    });

    expect(await subject.acquire(KEY)).toEqual({ allowed: true });
    await subject.release(KEY);
    expect(await subject.acquire(KEY)).toEqual({
      allowed: false,
      reason: 'rate',
    });
  });
});
