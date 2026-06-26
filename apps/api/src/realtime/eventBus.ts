import { EventEmitter } from 'node:events';

/**
 * Generic in-process pub/sub over a single `EventEmitter`. Domain-agnostic:
 * callers pick the channel string and payload shape. Used by SSE services to
 * fan domain events out to connected streams; a future AI chat feature can
 * reuse the same bus with its own channels.
 */
const emitter = new EventEmitter();
// No upper bound on listeners: every open stream subscribes, and an active
// store can have many concurrent guest sessions.
emitter.setMaxListeners(0);

export function publish<TPayload>(channel: string, payload: TPayload): void {
  emitter.emit(channel, payload);
}

export function subscribe<TPayload>(
  channel: string,
  listener: (payload: TPayload) => void,
): () => void {
  emitter.on(channel, listener);
  return () => {
    emitter.off(channel, listener);
  };
}
