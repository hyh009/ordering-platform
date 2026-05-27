import { useEffect, useState } from 'react';

/**
 * @reusable
 * @description Debounce a changing value before reacting to it.
 * @keywords debounce, debounced, delay, input, search
 */
export function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, value]);

  return debouncedValue;
}
