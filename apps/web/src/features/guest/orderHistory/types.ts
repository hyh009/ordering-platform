import type { Order } from '@/models/order';

export type GuestOrderHistoryEntry = {
  storeId: string;
  orderId: string;
  guestToken: string;
  createdAt: string;
  expiresAt: string;
};

export type GuestOrderHistoryItem = {
  entry: GuestOrderHistoryEntry;
  order: Order;
};
