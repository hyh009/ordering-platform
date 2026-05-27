import { useEffect, useRef, useState } from 'react';

/**
 * @reusable
 * @description Throttle a changing value to a fixed interval.
 * @keywords throttle, throttled, rate limit, interval, input
 */
export function useThrottle<T>(value: T, intervalMs: number) {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdatedAtRef = useRef(0);

  useEffect(() => {
    const now = Date.now();
    const remainingMs = intervalMs - (now - lastUpdatedAtRef.current);

    if (remainingMs <= 0) {
      lastUpdatedAtRef.current = now;
      setThrottledValue(value);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      lastUpdatedAtRef.current = Date.now();
      setThrottledValue(value);
    }, remainingMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [intervalMs, value]);

  return throttledValue;
}
