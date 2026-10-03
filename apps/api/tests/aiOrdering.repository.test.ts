import { describe, expect, it, vi } from 'vitest';

import { AI_ORDERING_MAX_TURNS_PER_CONVERSATION } from '../src/models/aiOrdering/model.js';

import type { AiOrderingTurnSnapshot } from '../src/models/aiOrdering/model.js';

const FIXED_DATE = new Date('2026-09-30T00:00:00.000Z');

const mongoMocks = vi.hoisted(() => {
  const fixedDate = new Date('2026-09-30T00:00:00.000Z');

  let nextFindOneResult: unknown = null;
  let nextFindOneAndUpdateResult: unknown = null;
  let nextExistsResult: unknown = null;

  const findOneCalls: unknown[] = [];
  const findOneAndUpdateCalls: {
    filter: unknown;
    update: unknown;
    options?: unknown;
  }[] = [];

  function query(read: () => unknown) {
    return {
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn(async () => read()),
    };
  }

  class ConversationModel {
    private readonly doc: Record<string, unknown>;

    constructor(doc: Record<string, unknown>) {
      this.doc = doc;
    }

    async save() {
      return this;
    }

    toObject() {
      return { ...this.doc, createdAt: fixedDate, updatedAt: fixedDate };
    }

    static findOne = vi.fn((filter: unknown) => {
      findOneCalls.push(filter);
      return query(() => nextFindOneResult);
    });

    static findOneAndUpdate = vi.fn(
      (filter: unknown, update: unknown, options?: unknown) => {
        findOneAndUpdateCalls.push({ filter, update, options });
        return query(() => nextFindOneAndUpdateResult);
      },
    );

    static exists = vi.fn(async () => nextExistsResult);
  }

  return {
    ConversationModel,
    findOneCalls,
    findOneAndUpdateCalls,
    setNextFindOneResult(value: unknown) {
      nextFindOneResult = value;
    },
    setNextFindOneAndUpdateResult(value: unknown) {
      nextFindOneAndUpdateResult = value;
    },
    setNextExistsResult(value: unknown) {
      nextExistsResult = value;
    },
    reset() {
      nextFindOneResult = null;
      nextFindOneAndUpdateResult = null;
      nextExistsResult = null;
      findOneCalls.length = 0;
      findOneAndUpdateCalls.length = 0;
    },
  };
});

vi.mock('@src/models/aiOrdering/mongo', () => ({
  AiOrderingConversationMongoModel: mongoMocks.ConversationModel,
}));

const { aiOrderingMongoRepository } =
  await import('../src/repositories/aiOrdering/mongo.repository.js');

function turn(id: string): AiOrderingTurnSnapshot {
  return {
    id,
    message: '來一杯珍奶',
    versionId: 'v1-2026-09-30',
    versionFingerprint: 'test-fingerprint',
    provider: 'gemini',
    modelName: 'test-model',
    response: { type: 'message', reply: 'Sure.' },
    quality: {
      repairAttempted: false,
      droppedOperationCount: 0,
      ownershipViolationCount: 0,
    },
    createdAt: FIXED_DATE,
  };
}

function storedConversation(turns: AiOrderingTurnSnapshot[] = []) {
  return {
    id: 'ai-conversation-1',
    organizationId: 'org-1',
    storeId: 'store-1',
    cartId: 'cart-1',
    participantId: 'participant-self',
    turns,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
  };
}


function proposalTurn(
  id: string,
  proposalId: string,
  decided = false,
): AiOrderingTurnSnapshot {
  return {
    ...turn(id),
    response: {
      type: 'proposal',
      reply: 'Shall I add these?',
      proposalId,
      confirmationRequired: true,
      operations: [
        {
          type: 'add_item',
          operationId: 'op-1',
          summary: '煎荷包蛋 x1',
          item: { productId: 'product-1', quantity: 1 },
        },
      ],
    },
    proposal: {
      proposalId,
      operations: [
        {
          type: 'add_item',
          operationId: 'op-1',
          summary: '煎荷包蛋 x1',
          item: { productId: 'product-1', quantity: 1 },
        },
      ],
      ...(decided
        ? {
            decision: {
              decidedAt: FIXED_DATE,
              results: [{ operationId: 'op-1', outcome: 'accepted' as const }],
            },
          }
        : {}),
    },
  };
}

describe('aiOrderingMongoRepository', () => {
  describe('findByParticipant', () => {
    it('looks the conversation up by store, cart and participant', async () => {
      mongoMocks.reset();
      mongoMocks.setNextFindOneResult(storedConversation());

      const found = await aiOrderingMongoRepository.findByParticipant({
        storeId: 'store-1',
        cartId: 'cart-1',
        participantId: 'participant-self',
      });

      expect(mongoMocks.findOneCalls[0]).toEqual({
        storeId: 'store-1',
        cartId: 'cart-1',
        participantId: 'participant-self',
      });
      expect(found?.id).toBe('ai-conversation-1');
    });

    it('returns null on a guest first turn', async () => {
      mongoMocks.reset();

      const found = await aiOrderingMongoRepository.findByParticipant({
        storeId: 'store-1',
        cartId: 'cart-1',
        participantId: 'participant-self',
      });

      expect(found).toBeNull();
    });
  });

  describe('create', () => {
    it('creates an empty conversation with a generated id', async () => {
      mongoMocks.reset();

      const created = await aiOrderingMongoRepository.create({
        organizationId: 'org-1',
        storeId: 'store-1',
        cartId: 'cart-1',
        participantId: 'participant-self',
      });

      expect(created.id).toMatch(/^ai-conversation-/);
      expect(created.organizationId).toBe('org-1');
      expect(created.turns).toEqual([]);
    });

    it('returns only entity fields, never persistence internals', async () => {
      mongoMocks.reset();

      const created = await aiOrderingMongoRepository.create({
        organizationId: 'org-1',
        storeId: 'store-1',
        cartId: 'cart-1',
        participantId: 'participant-self',
      });

      expect(Object.keys(created).sort()).toEqual(
        [
          'cartId',
          'createdAt',
          'id',
          'organizationId',
          'participantId',
          'storeId',
          'summarizedUpToTurnIndex',
          'summary',
          'turns',
          'updatedAt',
        ].sort(),
      );
    });
  });

  describe('appendTurn', () => {
    it('guards the turn ceiling inside the filter so the cap is atomic', async () => {
      mongoMocks.reset();
      mongoMocks.setNextFindOneAndUpdateResult(
        storedConversation([turn('turn-1')]),
      );

      await aiOrderingMongoRepository.appendTurn(
        'ai-conversation-1',
        turn('turn-1'),
      );

      const { filter } = mongoMocks.findOneAndUpdateCalls[0];
      const ceilingSlot = `turns.${AI_ORDERING_MAX_TURNS_PER_CONVERSATION - 1}`;

      // Checking the slot at the ceiling index inside the filter — rather than
      // reading the document and comparing lengths — is what makes two
      // concurrent appends unable to both pass and push past the cap.
      expect(filter).toMatchObject({
        id: 'ai-conversation-1',
        [ceilingSlot]: { $exists: false },
      });
    });

    it('never drops a stored turn to make room', async () => {
      mongoMocks.reset();
      mongoMocks.setNextFindOneAndUpdateResult(
        storedConversation([turn('turn-1')]),
      );

      await aiOrderingMongoRepository.appendTurn(
        'ai-conversation-1',
        turn('turn-1'),
      );

      const { update } = mongoMocks.findOneAndUpdateCalls[0];

      // Retention is the point of this collection: the ceiling refuses new
      // turns, it does not evict old ones.
      expect(update).toHaveProperty('$push');
      expect(update).not.toHaveProperty('$pop');
      expect(update).not.toHaveProperty('$pull');
      expect(JSON.stringify(update)).not.toContain('$slice');
    });

    it('refuses the append once the conversation is full', async () => {
      mongoMocks.reset();
      // No document matched the ceiling-guarded filter, but the conversation
      // itself still exists: it is full.
      mongoMocks.setNextFindOneAndUpdateResult(null);
      mongoMocks.setNextExistsResult({ _id: 'internal' });

      await expect(
        aiOrderingMongoRepository.appendTurn(
          'ai-conversation-1',
          turn('turn-51'),
        ),
      ).rejects.toThrow(
        new RegExp(`${AI_ORDERING_MAX_TURNS_PER_CONVERSATION} turns`),
      );
    });

    it('returns null when the conversation does not exist', async () => {
      mongoMocks.reset();
      mongoMocks.setNextFindOneAndUpdateResult(null);
      mongoMocks.setNextExistsResult(null);

      const result = await aiOrderingMongoRepository.appendTurn(
        'ai-conversation-missing',
        turn('turn-1'),
      );

      // Distinct from the full case: a missing conversation is not a conflict.
      expect(result).toBeNull();
    });
  });
  describe('findProposal', () => {
    it('scopes the lookup to the asking guest own conversation', async () => {
      mongoMocks.reset();
      mongoMocks.setNextFindOneResult({
        turns: [proposalTurn('turn-1', 'proposal-1')],
      });

      const result = await aiOrderingMongoRepository.findProposal({
        storeId: 'store-1',
        cartId: 'cart-1',
        participantId: 'participant-self',
        proposalId: 'proposal-1',
      });

      expect(result?.snapshot.proposalId).toBe('proposal-1');
      // The participant triple is IN the filter. A proposal id belonging to
      // another guest must be unreachable, not fetched and then rejected.
      expect(mongoMocks.findOneCalls.at(-1)).toEqual({
        storeId: 'store-1',
        cartId: 'cart-1',
        participantId: 'participant-self',
        'turns.proposal.proposalId': 'proposal-1',
      });
    });

    it('returns null for a proposal id that is not this guest own', async () => {
      mongoMocks.reset();
      mongoMocks.setNextFindOneResult(null);

      const result = await aiOrderingMongoRepository.findProposal({
        storeId: 'store-1',
        cartId: 'cart-1',
        participantId: 'participant-self',
        proposalId: 'proposal-from-another-cart',
      });

      expect(result).toBeNull();
    });
  });

  describe('recordProposalDecision', () => {
    const decision = {
      decidedAt: FIXED_DATE,
      results: [{ operationId: 'op-1', outcome: 'accepted' as const }],
    };

    it('claims the decision only when none is recorded yet', async () => {
      mongoMocks.reset();
      mongoMocks.setNextFindOneAndUpdateResult({
        turns: [proposalTurn('turn-1', 'proposal-1', true)],
      });

      const result = await aiOrderingMongoRepository.recordProposalDecision({
        storeId: 'store-1',
        cartId: 'cart-1',
        participantId: 'participant-self',
        proposalId: 'proposal-1',
        decision,
      });

      expect(result.claimed).toBe(true);
      // MongoDB refuses a positional projection together with returning the new
      // document, and the unit mock cannot know that — this is here because the
      // real database rejected it with
      // "cannot use a positional projection and return the new document".
      expect(mongoMocks.findOneAndUpdateCalls.at(-1)?.options).toMatchObject({
        returnDocument: 'before',
      });
      // The absence of a decision is asserted INSIDE the filter. Reading first
      // and then writing would let two concurrent acceptances both execute.
      expect(mongoMocks.findOneAndUpdateCalls.at(-1)?.filter).toEqual({
        storeId: 'store-1',
        cartId: 'cart-1',
        participantId: 'participant-self',
        turns: {
          $elemMatch: {
            'proposal.proposalId': 'proposal-1',
            'proposal.decision': { $exists: false },
          },
        },
      });
    });

    it('lets exactly one of two concurrent decisions win', async () => {
      mongoMocks.reset();
      // The first conditional update matches; the second finds the decision
      // already set, so its filter no longer matches.
      mongoMocks.setNextFindOneAndUpdateResult({
        turns: [proposalTurn('turn-1', 'proposal-1', true)],
      });

      const winner = await aiOrderingMongoRepository.recordProposalDecision({
        storeId: 'store-1',
        cartId: 'cart-1',
        participantId: 'participant-self',
        proposalId: 'proposal-1',
        decision,
      });

      mongoMocks.setNextFindOneAndUpdateResult(null);
      mongoMocks.setNextFindOneResult({
        turns: [proposalTurn('turn-1', 'proposal-1', true)],
      });

      const loser = await aiOrderingMongoRepository.recordProposalDecision({
        storeId: 'store-1',
        cartId: 'cart-1',
        participantId: 'participant-self',
        proposalId: 'proposal-1',
        decision,
      });

      expect(winner.claimed).toBe(true);
      expect(loser.claimed).toBe(false);
      // The loser still gets the proposal back, so the caller can tell the guest
      // it was already decided rather than that it expired.
      expect(loser.proposal?.snapshot.decision).toBeDefined();
    });

    it('reports a missing proposal differently from an already decided one', async () => {
      mongoMocks.reset();
      mongoMocks.setNextFindOneAndUpdateResult(null);
      mongoMocks.setNextFindOneResult(null);

      const result = await aiOrderingMongoRepository.recordProposalDecision({
        storeId: 'store-1',
        cartId: 'cart-1',
        participantId: 'participant-self',
        proposalId: 'proposal-gone',
        decision,
      });

      // Expiry and a repeated decision are different things to tell a guest, so
      // they must not collapse into one answer here.
      expect(result).toEqual({ claimed: false, proposal: null });
    });
  });
});
