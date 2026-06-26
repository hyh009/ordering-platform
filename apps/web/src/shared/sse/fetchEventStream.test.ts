import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectSse } from './fetchEventStream';
import type { SseEvent } from './types';

/**
 * Builds a Response whose body streams the given string chunks. The returned
 * `endStream` resolves the final read so a test can simulate the server closing
 * the connection on demand.
 */
function streamingResponse(chunks: string[]) {
  let resolveEnd: () => void = () => {};
  const ended = new Promise<void>((resolve) => {
    resolveEnd = resolve;
  });
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      await ended;
      controller.close();
    },
  });

  return {
    response: new Response(body, { status: 200 }),
    endStream: () => resolveEnd(),
  };
}

describe('connectSse', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('opens, parses streamed events, and forwards them to onEvent', async () => {
    const { response } = streamingResponse([
      'event: cart_updated\ndata: {"id":"c1"}\n\n',
    ]);
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);

    const events: SseEvent[] = [];
    const onOpen = vi.fn();
    const connection = connectSse('https://x/stream', {
      headers: { Authorization: 'Bearer t' },
      onOpen,
      onEvent: (e) => events.push(e),
    });

    await vi.waitFor(() => expect(events).toHaveLength(1));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(events[0]).toEqual({ event: 'cart_updated', data: '{"id":"c1"}' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://x/stream',
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'text/event-stream',
          Authorization: 'Bearer t',
        }),
      }),
    );

    connection.close();
  });

  it('reconnects after the stream ends, with backoff', async () => {
    const first = streamingResponse([]);
    const second = streamingResponse([]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(first.response)
      .mockResolvedValueOnce(second.response);
    vi.stubGlobal('fetch', fetchMock);

    const connection = connectSse('https://x/stream', { onEvent: vi.fn() });

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    // Server closes the stream; client should schedule a reconnect.
    first.endStream();
    await vi.waitFor(() => expect(first.response.body?.locked).toBe(true));

    // Backoff is ~1s; advance timers to trigger the reconnect.
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    connection.close();
    second.endStream();
  });

  it('retries on a failed connection and surfaces onError', async () => {
    const ok = streamingResponse([]);
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(ok.response);
    vi.stubGlobal('fetch', fetchMock);

    const onError = vi.fn();
    const connection = connectSse('https://x/stream', {
      onEvent: vi.fn(),
      onError,
    });

    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    connection.close();
    ok.endStream();
  });

  it('stops reconnecting after close() and aborts the active request', async () => {
    const { response, endStream } = streamingResponse([]);
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);

    const connection = connectSse('https://x/stream', { onEvent: vi.fn() });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const passedSignal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    connection.close();

    expect(passedSignal.aborted).toBe(true);

    // Even if the stream ends, no reconnect should be scheduled.
    endStream();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not connect when an already-aborted signal is provided', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    controller.abort();
    connectSse('https://x/stream', {
      onEvent: vi.fn(),
      signal: controller.signal,
    });

    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
