import { createSseParser } from './parseSse';
import type { SseConnectOptions, SseConnection } from './types';

const INITIAL_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;

/**
 * Domain-agnostic fetch-based SSE client. Unlike the native `EventSource`, this
 * supports custom request headers (e.g. an `Authorization` bearer token) by
 * reading the response body stream directly.
 *
 * It auto-reconnects with capped exponential backoff and resyncs purely through
 * whatever the server pushes on reconnect. Call `close()` (or abort the passed
 * signal) to stop the active request and the reconnect loop.
 */
export function connectSse(
  url: string,
  options: SseConnectOptions,
): SseConnection {
  const { headers, onEvent, onOpen, onError, signal } = options;

  let closed = false;
  let retryMs = INITIAL_RETRY_MS;
  let controller: AbortController | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function close() {
    if (closed) return;
    closed = true;
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    controller?.abort();
    controller = null;
  }

  if (signal) {
    if (signal.aborted) {
      close();
    } else {
      signal.addEventListener('abort', close, { once: true });
    }
  }

  function scheduleReconnect() {
    if (closed) return;
    const delay = retryMs;
    retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void run();
    }, delay);
  }

  async function run(): Promise<void> {
    if (closed) return;

    controller = new AbortController();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'text/event-stream', ...headers },
        credentials: 'include',
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`SSE connection failed with status ${response.status}`);
      }

      // A successful open resets backoff so a later drop retries quickly.
      retryMs = INITIAL_RETRY_MS;
      onOpen?.();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = createSseParser();

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const event of parser.push(chunk)) {
          onEvent(event);
        }
      }

      // Stream ended without an abort: treat as a recoverable drop.
      if (!closed) {
        scheduleReconnect();
      }
    } catch (error) {
      if (closed) return;
      // An abort from close() surfaces here; ignore it.
      if (controller?.signal.aborted) return;

      onError?.(error);
      scheduleReconnect();
    }
  }

  void run();

  return { close };
}
