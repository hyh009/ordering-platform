import type { SseEvent } from './types';

/**
 * Incremental, domain-agnostic Server-Sent Events parser.
 *
 * Streamed chunks rarely align with event boundaries, so the parser buffers
 * partial input and only emits a frame once a blank line completes it. It
 * follows the SSE wire format: `event:` sets the type, repeated `data:` lines
 * are joined with `\n`, `id:` sets the last id, and lines starting with `:`
 * are comments (used for heartbeats) and ignored.
 */
export function createSseParser() {
  let buffer = '';
  let eventType = '';
  let dataLines: string[] = [];
  let lastId: string | undefined;

  function resetFrame() {
    eventType = '';
    dataLines = [];
    lastId = undefined;
  }

  function takeFrame(): SseEvent | null {
    if (dataLines.length === 0 && eventType === '') {
      // Comment-only or empty block (e.g. a heartbeat); nothing to emit.
      resetFrame();
      return null;
    }

    const event: SseEvent = {
      event: eventType || 'message',
      data: dataLines.join('\n'),
    };
    if (lastId !== undefined) {
      event.id = lastId;
    }

    resetFrame();
    return event;
  }

  function consumeLine(line: string): SseEvent | null {
    // A blank line dispatches the buffered frame.
    if (line === '') {
      return takeFrame();
    }

    // Comment line (heartbeat). Ignore.
    if (line.startsWith(':')) {
      return null;
    }

    const colonIndex = line.indexOf(':');
    const field = colonIndex === -1 ? line : line.slice(0, colonIndex);
    let value = colonIndex === -1 ? '' : line.slice(colonIndex + 1);
    // A single leading space after the colon is part of the format, not data.
    if (value.startsWith(' ')) {
      value = value.slice(1);
    }

    switch (field) {
      case 'event':
        eventType = value;
        break;
      case 'data':
        dataLines.push(value);
        break;
      case 'id':
        lastId = value;
        break;
      // `retry` and unknown fields are intentionally ignored.
      default:
        break;
    }

    return null;
  }

  return {
    /** Feed a raw chunk; returns any complete frames it produced. */
    push(chunk: string): SseEvent[] {
      buffer += chunk;
      const events: SseEvent[] = [];

      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        let line = buffer.slice(0, newlineIndex);
        // Tolerate CRLF line endings.
        if (line.endsWith('\r')) {
          line = line.slice(0, -1);
        }
        buffer = buffer.slice(newlineIndex + 1);

        const event = consumeLine(line);
        if (event) {
          events.push(event);
        }

        newlineIndex = buffer.indexOf('\n');
      }

      return events;
    },
  };
}

export type SseParser = ReturnType<typeof createSseParser>;
