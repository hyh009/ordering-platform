import { EventEmitter } from 'node:events';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { openSseStream } from '../src/realtime/sse.js';

import type { Request, Response } from 'express';

type FakeRes = Response & {
  writes: string[];
  headers: Record<string, string>;
  statusCode: number;
  flushed: boolean;
  ended: boolean;
};

function createFakeReq(): Request {
  return new EventEmitter() as unknown as Request;
}

function createFakeRes(): FakeRes {
  const writes: string[] = [];
  const headers: Record<string, string> = {};
  const res = {
    writes,
    headers,
    statusCode: 0,
    flushed: false,
    ended: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(name: string, value: string) {
      headers[name] = value;
      return this;
    },
    flushHeaders() {
      this.flushed = true;
    },
    write(chunk: string) {
      writes.push(chunk);
      return true;
    },
    end() {
      this.ended = true;
    },
  };
  return res as unknown as FakeRes;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('openSseStream', () => {
  it('sets event-stream headers and flushes them', () => {
    const req = createFakeReq();
    const res = createFakeRes();

    openSseStream(res, { req });

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('text/event-stream');
    expect(res.headers['Cache-Control']).toBe('no-cache, no-transform');
    expect(res.headers['Connection']).toBe('keep-alive');
    expect(res.flushed).toBe(true);
  });

  it('frames a named event with JSON data', () => {
    const req = createFakeReq();
    const res = createFakeRes();

    const stream = openSseStream(res, { req });
    stream.send({ event: 'cart_updated', data: { type: 'cart_updated' } });

    expect(res.writes).toContain(
      'event: cart_updated\ndata: {"type":"cart_updated"}\n\n',
    );
  });

  it('emits heartbeat comments on the interval', () => {
    vi.useFakeTimers();
    const req = createFakeReq();
    const res = createFakeRes();

    openSseStream(res, { req, heartbeatIntervalMs: 1000 });
    vi.advanceTimersByTime(2500);

    const heartbeats = res.writes.filter((w) => w === ': heartbeat\n\n');
    expect(heartbeats).toHaveLength(2);
  });

  it('clears the heartbeat and ends the response on req close', () => {
    vi.useFakeTimers();
    const req = createFakeReq();
    const res = createFakeRes();

    openSseStream(res, { req, heartbeatIntervalMs: 1000 });
    req.emit('close');

    vi.advanceTimersByTime(5000);

    expect(res.ended).toBe(true);
    expect(res.writes.filter((w) => w === ': heartbeat\n\n')).toHaveLength(0);
  });

  it('stops writing after close', () => {
    const req = createFakeReq();
    const res = createFakeRes();

    const stream = openSseStream(res, { req });
    stream.close();
    stream.send({ event: 'order_updated', data: {} });

    expect(res.writes.some((w) => w.startsWith('event:'))).toBe(false);
  });
});
