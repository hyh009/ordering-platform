/**
 * The narrow slice of the Redis client that application code uses.
 *
 * Declared structurally rather than importing node-redis' generic client type, so
 * callers depend on the four commands they actually issue and tests can supply a
 * plain object.
 */
export type AppRedisClient = {
  incr(key: string): Promise<number>;
  pExpire(key: string, milliseconds: number): Promise<unknown>;
  set(
    key: string,
    value: string,
    options: { NX: true; PX: number },
  ): Promise<string | null>;
  del(key: string): Promise<unknown>;
};

let client: AppRedisClient | null = null;

/**
 * Publishes the connected client for the rest of the process.
 *
 * `server.ts` connects Redis during startup, but module singletons are
 * constructed at import time — before that happens. So consumers resolve the
 * client lazily through `getRedisClient()` on each use rather than capturing it
 * at construction, and this holder is what makes that possible.
 */
export function setRedisClient(next: AppRedisClient): void {
  client = next;
}

export function hasRedisClient(): boolean {
  return client !== null;
}

/**
 * Returns the connected client, or throws.
 *
 * Throwing is deliberate: a feature that needs Redis and cannot reach it should
 * fail its request loudly, not silently fall back to per-process state that
 * looks like it is working.
 */
export function getRedisClient(): AppRedisClient {
  if (!client) {
    throw new Error(
      'Redis client requested before it was connected. Call setRedisClient during startup.',
    );
  }

  return client;
}
