import { useEffect, useState } from 'react';

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) return 'just now';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
}

/**
 * Self-contained UI hook that formats a timestamp as a relative-time string and
 * re-renders every 30 seconds so the display stays fresh.
 *
 * This is pure presentational state (a setInterval ticker) and does NOT belong
 * in the page VM — it owns only its own interval and derived display string.
 *
 * @param timestamp Unix ms timestamp, or null to get an empty string.
 * @returns Human-readable string such as "just now", "2 minutes ago", etc.
 */
export function useRelativeTime(timestamp: number | null): string {
  const [display, setDisplay] = useState<string>(() =>
    timestamp !== null ? formatRelativeTime(timestamp) : '',
  );

  useEffect(() => {
    const update = () =>
      setDisplay(timestamp !== null ? formatRelativeTime(timestamp) : '');

    // Defer the initial update so it runs as an async callback (not
    // synchronously in the effect body), then refresh every 30 s.
    const immediateId = setTimeout(update, 0);
    const intervalId = setInterval(update, 30_000);

    return () => {
      clearTimeout(immediateId);
      clearInterval(intervalId);
    };
  }, [timestamp]);

  return display;
}
