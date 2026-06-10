import { EventEmitter } from 'node:events';

import type { OrderEntity } from '@src/models/order/model';

/**
 * In-process pub/sub for order changes, consumed by the guest SSE stream.
 * Future staff/kitchen order mutations must emit through this service too so
 * guests see live status updates.
 */
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

function eventName(orderId: string): string {
  return `order_updated:${orderId}`;
}

export function emitOrderUpdated(order: OrderEntity): void {
  emitter.emit(eventName(order.id), order);
}

export function subscribeToOrderUpdates(
  orderId: string,
  listener: (order: OrderEntity) => void,
): () => void {
  const name = eventName(orderId);
  emitter.on(name, listener);
  return () => {
    emitter.off(name, listener);
  };
}
