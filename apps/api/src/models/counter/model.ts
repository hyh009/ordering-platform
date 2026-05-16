export const counterScopes = ['order_daily_sequence'] as const;

export type CounterScope = (typeof counterScopes)[number];

export type CounterEntity = {
  _id: string;
  scope: CounterScope;
  organizationId: string;
  businessDate: string;
  sequence: number;
  createdAt: Date;
  updatedAt: Date;
};

export function buildDailyOrderCounterId(
  organizationId: string,
  businessDate: string,
): string {
  return `order_daily_sequence:${organizationId}:${businessDate}`;
}
