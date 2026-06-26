import type { Request, Response } from 'express';

const DEFAULT_HEARTBEAT_INTERVAL_MS = 25_000;

/**
 * A single Server-Sent Events frame: a named event carrying a JSON payload.
 */
export type SseFrame = {
  event: string;
  data: unknown;
};

export type OpenSseStreamOptions = {
  /** Request whose `close` event tears the stream down. */
  req: Request;
  /** Heartbeat comment interval in ms. Defaults to 25s. */
  heartbeatIntervalMs?: number;
};

export type SseStream = {
  /** Write one named event frame to the client. */
  send: (frame: SseFrame) => void;
  /** Stop the heartbeat, run cleanup, and end the response. */
  close: () => void;
};

/**
 * Open a Server-Sent Events response: set streaming headers, flush them, start
 * a heartbeat, and wire `req.close` cleanup. Domain-agnostic — it knows nothing
 * about carts or orders, only how to frame events and keep the socket alive.
 */
export function openSseStream(
  res: Response,
  opts: OpenSseStreamOptions,
): SseStream {
  const heartbeatIntervalMs =
    opts.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let closed = false;

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, heartbeatIntervalMs);

  const close = () => {
    if (closed) {
      return;
    }
    closed = true;
    clearInterval(heartbeat);
    res.end();
  };

  const send = (frame: SseFrame) => {
    if (closed) {
      return;
    }
    res.write(`event: ${frame.event}\ndata: ${JSON.stringify(frame.data)}\n\n`);
  };

  opts.req.on('close', close);

  return { send, close };
}
