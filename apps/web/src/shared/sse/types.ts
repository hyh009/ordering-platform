/**
 * A parsed Server-Sent Events frame. Heartbeat comment lines (`:`) are consumed
 * by the parser and never surfaced as events.
 */
export type SseEvent = {
  /** The `event:` field value, or `'message'` when none was sent. */
  event: string;
  /** The joined `data:` field value (multi-line data joined with `\n`). */
  data: string;
  /** The `id:` field value when present. */
  id?: string;
};

export type SseConnectOptions = {
  /** Extra request headers, e.g. an `Authorization` bearer token. */
  headers?: Record<string, string>;
  /** Called for every parsed event frame. */
  onEvent: (event: SseEvent) => void;
  /** Called each time a connection is successfully opened (including reconnects). */
  onOpen?: () => void;
  /**
   * Called when a connection attempt fails or the stream ends unexpectedly.
   * The client still auto-reconnects unless it has been closed.
   */
  onError?: (error: unknown) => void;
  /**
   * Optional external abort signal. Aborting it stops the stream and reconnect
   * loop, the same as calling `close()`.
   */
  signal?: AbortSignal;
};

export type SseConnection = {
  /** Aborts the active request and permanently stops the reconnect loop. */
  close: () => void;
};
