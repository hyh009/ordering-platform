import { describe, expect, it } from 'vitest';
import { createSseParser } from './parseSse';

describe('createSseParser', () => {
  it('parses a single event with type and data', () => {
    const parser = createSseParser();
    const events = parser.push('event: cart_updated\ndata: {"a":1}\n\n');

    expect(events).toEqual([
      { event: 'cart_updated', data: '{"a":1}' },
    ]);
  });

  it('defaults the event type to "message" when no event field is sent', () => {
    const parser = createSseParser();
    const events = parser.push('data: hello\n\n');

    expect(events).toEqual([{ event: 'message', data: 'hello' }]);
  });

  it('joins multi-line data fields with newlines', () => {
    const parser = createSseParser();
    const events = parser.push('data: line one\ndata: line two\n\n');

    expect(events).toEqual([{ event: 'message', data: 'line one\nline two' }]);
  });

  it('ignores comment (heartbeat) lines and emits nothing for them', () => {
    const parser = createSseParser();
    const events = parser.push(': keep-alive\n\n');

    expect(events).toEqual([]);
  });

  it('still emits the next real event after a heartbeat comment', () => {
    const parser = createSseParser();
    parser.push(': ping\n\n');
    const events = parser.push('event: order_updated\ndata: {"id":"o1"}\n\n');

    expect(events).toEqual([
      { event: 'order_updated', data: '{"id":"o1"}' },
    ]);
  });

  it('captures the id field when present', () => {
    const parser = createSseParser();
    const events = parser.push('id: 42\ndata: x\n\n');

    expect(events).toEqual([{ event: 'message', data: 'x', id: '42' }]);
  });

  it('buffers a frame split across multiple chunks', () => {
    const parser = createSseParser();

    expect(parser.push('event: cart_up')).toEqual([]);
    expect(parser.push('dated\ndata: {"a"')).toEqual([]);
    const events = parser.push(':1}\n\n');

    expect(events).toEqual([{ event: 'cart_updated', data: '{"a":1}' }]);
  });

  it('parses multiple events in one chunk', () => {
    const parser = createSseParser();
    const events = parser.push(
      'data: first\n\ndata: second\n\n',
    );

    expect(events).toEqual([
      { event: 'message', data: 'first' },
      { event: 'message', data: 'second' },
    ]);
  });

  it('tolerates CRLF line endings', () => {
    const parser = createSseParser();
    const events = parser.push('event: a\r\ndata: b\r\n\r\n');

    expect(events).toEqual([{ event: 'a', data: 'b' }]);
  });

  it('treats a field with no leading space after colon as valid data', () => {
    const parser = createSseParser();
    const events = parser.push('data:no-space\n\n');

    expect(events).toEqual([{ event: 'message', data: 'no-space' }]);
  });
});
