import { describe, expect, it } from 'vitest';

import { groupCartItemsByParticipant } from './participantGroups';

import type { Cart, CartItem, OrderingParticipant } from './types';

function participant(id: string): OrderingParticipant {
  return { id, avatarKey: 'bear' } as OrderingParticipant;
}

function item(id: string, addedByParticipantId?: string): CartItem {
  return {
    id,
    quantity: 1,
    totalItemPrice: 100,
    ...(addedByParticipantId !== undefined ? { addedByParticipantId } : {}),
  } as CartItem;
}

function cart(input: {
  participants: OrderingParticipant[];
  items: CartItem[];
}): Cart {
  return input as unknown as Cart;
}

describe('groupCartItemsByParticipant', () => {
  it('returns nothing when there is no cart', () => {
    expect(groupCartItemsByParticipant(null, 'participant-a')).toEqual([]);
  });

  it('buckets each item under the participant who added it', () => {
    const groups = groupCartItemsByParticipant(
      cart({
        participants: [participant('participant-a'), participant('participant-b')],
        items: [
          item('item-1', 'participant-a'),
          item('item-2', 'participant-b'),
          item('item-3', 'participant-a'),
        ],
      }),
      'participant-a',
    );

    expect(groups.map((group) => group.items.map((i) => i.id))).toEqual([
      ['item-1', 'item-3'],
      ['item-2'],
    ]);
  });

  it('follows the cart participant order, not the item order', () => {
    const groups = groupCartItemsByParticipant(
      cart({
        participants: [participant('participant-a'), participant('participant-b')],
        items: [item('item-1', 'participant-b')],
      }),
      'participant-b',
    );

    expect(groups.map((group) => group.participant.id)).toEqual([
      'participant-a',
      'participant-b',
    ]);
  });

  it('keeps a participant who has nothing in the cart', () => {
    const groups = groupCartItemsByParticipant(
      cart({
        participants: [participant('participant-a'), participant('participant-b')],
        items: [item('item-1', 'participant-a')],
      }),
      'participant-a',
    );

    // The section still renders, with its own empty state, rather than the
    // participant vanishing from a shared cart.
    expect(groups[1]).toEqual({
      participant: participant('participant-b'),
      items: [],
      isCurrentUser: false,
    });
  });

  it('leaves out an item that belongs to no participant', () => {
    const groups = groupCartItemsByParticipant(
      cart({
        participants: [participant('participant-a')],
        items: [item('item-1', 'participant-a'), item('item-orphan')],
      }),
      'participant-a',
    );

    // There is no section to show it in, and inventing one would claim a
    // participant the cart does not have.
    expect(groups).toHaveLength(1);
    expect(groups[0]?.items.map((i) => i.id)).toEqual(['item-1']);
  });

  it('marks exactly one group as the current user', () => {
    const groups = groupCartItemsByParticipant(
      cart({
        participants: [
          participant('participant-a'),
          participant('participant-b'),
          participant('participant-c'),
        ],
        items: [],
      }),
      'participant-b',
    );

    expect(groups.map((group) => group.isCurrentUser)).toEqual([
      false,
      true,
      false,
    ]);
  });

  it('marks nobody as the current user without a participant id', () => {
    const groups = groupCartItemsByParticipant(
      cart({
        participants: [participant('participant-a')],
        items: [],
      }),
      null,
    );

    // A session with no participant id must not be handed edit controls for
    // someone else's items.
    expect(groups.every((group) => !group.isCurrentUser)).toBe(true);
  });
});
