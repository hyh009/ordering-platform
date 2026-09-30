export type AiOrderingRateLimitRejection = 'rate' | 'concurrent';

export type AiOrderingRateLimitDecision =
  | { allowed: true }
  | { allowed: false; reason: AiOrderingRateLimitRejection };

export type AiOrderingRateLimiter = {
  /** Reserves a slot for this key, or refuses with the reason. */
  acquire(key: string): Promise<AiOrderingRateLimitDecision>;
  /** Releases the in-flight slot. Safe to call after a refusal. */
  release(key: string): Promise<void>;
};

export type InMemoryAiOrderingRateLimiterOptions = {
  maxRequestsPerWindow: number;
  windowMs: number;
  now?: () => number;
};

type Bucket = {
  windowStartedAt: number;
  count: number;
  inFlight: boolean;
};

/**
 * Per-process request limiting for the assistant endpoint.
 *
 * The endpoint is public, the caller has no account, and the provider is
 * metered, so a guard has to exist before the first model call rather than
 * after the first surprising bill.
 *
 * **This implementation counts per process.** Behind N API instances a guest
 * effectively gets N times the limit. That is a deliberate trade for now: the
 * assistant ships disabled, Redis is not currently exposed as a shared client,
 * and wiring one through startup is a change to infrastructure this slice does
 * not otherwise touch. The interface above is the part that matters — a
 * Redis-backed implementation is a drop-in replacement whenever multi-instance
 * accuracy starts to matter.
 *
 * The concurrency slot is separate from the rate window on purpose. One
 * in-flight request per guest both bounds cost and removes double-submit races
 * on the proposal flow, and it does that even when the rate window still has
 * room.
 */
export function createInMemoryAiOrderingRateLimiter(
  options: InMemoryAiOrderingRateLimiterOptions,
): AiOrderingRateLimiter {
  const now = options.now ?? (() => Date.now());
  const buckets = new Map<string, Bucket>();

  function sweep(currentTime: number): void {
    for (const [key, bucket] of buckets) {
      const expired =
        currentTime - bucket.windowStartedAt >= options.windowMs * 2;

      // Never drop a bucket that still holds an in-flight slot: doing so would
      // hand the same guest a second concurrent call.
      if (expired && !bucket.inFlight) {
        buckets.delete(key);
      }
    }
  }

  return {
    async acquire(key: string) {
      const currentTime = now();
      sweep(currentTime);

      const existing = buckets.get(key);
      const bucket: Bucket =
        existing && currentTime - existing.windowStartedAt < options.windowMs
          ? existing
          : {
              windowStartedAt: currentTime,
              count: 0,
              inFlight: existing?.inFlight ?? false,
            };

      buckets.set(key, bucket);

      if (bucket.inFlight) {
        return { allowed: false, reason: 'concurrent' };
      }

      if (bucket.count >= options.maxRequestsPerWindow) {
        return { allowed: false, reason: 'rate' };
      }

      bucket.count += 1;
      bucket.inFlight = true;

      return { allowed: true };
    },

    async release(key: string) {
      const bucket = buckets.get(key);

      if (bucket) {
        bucket.inFlight = false;
      }
    },
  };
}
