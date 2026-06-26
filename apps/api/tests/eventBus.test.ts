import { describe, expect, it, vi } from 'vitest';

import { publish, subscribe } from '../src/realtime/eventBus.js';

describe('realtime eventBus', () => {
  it('delivers published payloads to subscribers of the same channel', () => {
    const listener = vi.fn();
    subscribe('channel-a', listener);

    publish('channel-a', { value: 1 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ value: 1 });
  });

  it('isolates channels', () => {
    const a = vi.fn();
    const b = vi.fn();
    subscribe('iso-a', a);
    subscribe('iso-b', b);

    publish('iso-a', 'hit');

    expect(a).toHaveBeenCalledWith('hit');
    expect(b).not.toHaveBeenCalled();
  });

  it('fans out to every subscriber of a channel', () => {
    const first = vi.fn();
    const second = vi.fn();
    subscribe('fanout', first);
    subscribe('fanout', second);

    publish('fanout', 42);

    expect(first).toHaveBeenCalledWith(42);
    expect(second).toHaveBeenCalledWith(42);
  });

  it('stops delivering after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe('unsub', listener);

    publish('unsub', 'first');
    unsubscribe();
    publish('unsub', 'second');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('first');
  });
});
