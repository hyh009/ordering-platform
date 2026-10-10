import { describe, expect, it } from 'vitest';

import { toAiOrderingReviewTurnRow } from './conversationTurnRow';

import type { AiOrderingReviewTurn } from '@/models/aiOrdering';

const turn: AiOrderingReviewTurn = {
  id: 'turn-1',
  message: '一杯紅茶',
  response: { type: 'message', reply: '幫你加一杯紅茶。' },
  versionId: 'v1-2026-09-30',
  versionFingerprint: 'abc123',
  provider: 'gemini',
  modelName: 'test-model',
  repairAttempted: false,
  droppedOperationCount: 0,
  ownershipViolationCount: 0,
  createdAt: '2026-10-01T00:00:00.000Z',
};

describe('a review row for a proposal the guest changed', () => {
  const adjustment = {
    operationId: 'op-1',
    proposed: '+ 紅茶 ×1 · 無糖',
    applied: '+ 紅茶 ×1 · 半糖',
  };

  it('lists each operation the guest changed with both versions', () => {
    expect(
      toAiOrderingReviewTurnRow({ ...turn, guestAdjustments: [adjustment] })
        .guestAdjustments,
    ).toEqual([adjustment]);
  });

  it('has an empty list for a turn the guest changed nothing on', () => {
    // Always a list, so the view never has to tell "none" from "not recorded":
    // a turn stored before this existed reads as applied as proposed.
    expect(toAiOrderingReviewTurnRow(turn).guestAdjustments).toEqual([]);
  });

  it('does not count a guest correction as a degraded turn', () => {
    // `wasDegraded` is the backend having to repair or cut the model's answer.
    // The guest changing a choice is a different signal with its own badge.
    expect(
      toAiOrderingReviewTurnRow({ ...turn, guestAdjustments: [adjustment] })
        .wasDegraded,
    ).toBe(false);
  });
});
