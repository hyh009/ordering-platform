import type { Cart, CartItem, OrderingParticipant } from './types';

export type CartParticipantGroup = {
  participant: OrderingParticipant;
  items: CartItem[];
  /** True for the participant whose session is reading the cart. */
  isCurrentUser: boolean;
};

/**
 * Buckets a cart's items by the participant who added them.
 *
 * `isCurrentUser` is the answer to "may this session edit these items", so this
 * derivation has exactly one home. Two surfaces render the cart — the cart page
 * and the ordering assistant — and a second copy of this logic would mean two
 * answers to that question, in the one place where a wrong answer lets a guest
 * change someone else's order.
 *
 * Every participant gets a group, including one with nothing in the cart, so a
 * section can render its empty state rather than disappearing. Items whose
 * `addedByParticipantId` matches no participant are left out: there is no section
 * to show them in, and inventing one would claim a participant that is not in the
 * cart.
 */
export function groupCartItemsByParticipant(
  cart: Cart | null,
  currentParticipantId: string | null,
): CartParticipantGroup[] {
  if (!cart) return [];

  const itemsByParticipantId = new Map<string, CartItem[]>();

  for (const item of cart.items) {
    const key = item.addedByParticipantId ?? 'unknown';
    const bucket = itemsByParticipantId.get(key);

    if (bucket) {
      bucket.push(item);
    } else {
      itemsByParticipantId.set(key, [item]);
    }
  }

  return cart.participants.map((participant) => ({
    participant,
    items: itemsByParticipantId.get(participant.id) ?? [],
    isCurrentUser: participant.id === currentParticipantId,
  }));
}
