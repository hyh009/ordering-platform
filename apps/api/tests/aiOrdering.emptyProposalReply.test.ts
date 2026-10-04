import { describe, expect, it } from 'vitest';

import {
  AI_ORDERING_EMPTY_PROPOSAL_REPLY,
  resolveAiOrderingEmptyProposalReply,
} from '../src/modules/aiOrdering/emptyProposalReply.js';

describe('AI ordering empty proposal reply', () => {
  it('answers in Chinese when the guest wrote in Chinese', () => {
    expect(resolveAiOrderingEmptyProposalReply('我要一碗白飯', 'en')).toBe(
      AI_ORDERING_EMPTY_PROPOSAL_REPLY['zh-TW'],
    );
  });

  it('answers in English when the guest wrote in English', () => {
    // The store's locale is not the guest's language. This line is the only
    // thing the guest reads that turn, so it follows what they typed.
    expect(
      resolveAiOrderingEmptyProposalReply('one steamed rice please', 'zh-TW'),
    ).toBe(AI_ORDERING_EMPTY_PROPOSAL_REPLY.en);
  });

  it('reads a mixed message as Chinese', () => {
    expect(resolveAiOrderingEmptyProposalReply('我要 2 杯 latte', 'en')).toBe(
      AI_ORDERING_EMPTY_PROPOSAL_REPLY['zh-TW'],
    );
  });

  it('falls back to the store locale when the message names no language', () => {
    expect(resolveAiOrderingEmptyProposalReply('2 👍', 'zh-TW')).toBe(
      AI_ORDERING_EMPTY_PROPOSAL_REPLY['zh-TW'],
    );
    expect(resolveAiOrderingEmptyProposalReply('2 👍', 'en')).toBe(
      AI_ORDERING_EMPTY_PROPOSAL_REPLY.en,
    );
  });
});
