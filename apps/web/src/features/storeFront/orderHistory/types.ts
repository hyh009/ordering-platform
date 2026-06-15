import type { Order } from '@/models/order';

export type StoreFrontOrderHistoryEntry = {
  storeId: string;
  orderId: string;
  guestToken: string;
  createdAt: string;
  expiresAt: string;
};

export type StoreFrontOrderHistoryItem = {
  entry: StoreFrontOrderHistoryEntry;
  order: Order;
};
