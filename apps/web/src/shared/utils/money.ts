// MVP renders all prices as NT$; product.price has no currency field yet.
export function formatPrice(amount: number): string {
  return `NT$${amount.toLocaleString('en-US')}`;
}
