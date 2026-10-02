/**
 * Conversation entities to the DTOs the merchant review surface and the guest's
 * own transcript read.
 *
 * Everything here is a narrowing. `modelOutput` in particular never crosses this
 * boundary: it is the raw provider reply, kept for replay and evaluation, and it
 * is neither a stable shape nor something a backstage reader should depend on.
 * The merchant sees what the GUEST saw, plus the signals that explain it.
 */

import type {
  AiOrderingConversationDetailDto,
  AiOrderingConversationSummaryDto,
  AiOrderingGuestConversationDto,
  AiOrderingGuestTurnDto,
  AiOrderingReviewTurnDto,
  AiOrderingUnansweredEntryDto,
} from '@repo/shared';
import type {
  AiOrderingConversationEntity,
  AiOrderingTurnSnapshot,
} from '@src/models/aiOrdering/model';

export function toAiOrderingReviewTurnDto(
  turn: AiOrderingTurnSnapshot,
): AiOrderingReviewTurnDto {
  const dto: AiOrderingReviewTurnDto = {
    id: turn.id,
    message: turn.message,
    response: turn.response,
    versionId: turn.versionId,
    versionFingerprint: turn.versionFingerprint,
    provider: turn.provider,
    modelName: turn.modelName,
    repairAttempted: turn.quality.repairAttempted,
    droppedOperationCount: turn.quality.droppedOperationCount,
    ownershipViolationCount: turn.quality.ownershipViolationCount,
    createdAt: turn.createdAt.toISOString(),
  };

  if (turn.quality.repairSucceeded !== undefined) {
    dto.repairSucceeded = turn.quality.repairSucceeded;
  }

  return dto;
}

/**
 * One stored turn as its own guest reads it back.
 *
 * A separate narrowing from the review DTO rather than a subset of it: the
 * fields left out here — fingerprint, provider, model name, quality signals —
 * are not merely uninteresting to a guest, they are internals that a storefront
 * response must not carry. Writing the fields out explicitly is what makes a
 * future addition to the snapshot a deliberate decision on both surfaces.
 */
export function toAiOrderingGuestTurnDto(
  turn: AiOrderingTurnSnapshot,
): AiOrderingGuestTurnDto {
  return {
    id: turn.id,
    message: turn.message,
    response: turn.response,
    versionId: turn.versionId,
    createdAt: turn.createdAt.toISOString(),
  };
}

/**
 * The guest's transcript, or an empty one before their first turn.
 *
 * `null` in, empty `turns` out: "no conversation yet" and "a conversation with no
 * turns" are the same thing to the panel, and collapsing them here keeps the
 * client from branching on a distinction it has no use for.
 */
export function toAiOrderingGuestConversationDto(
  conversation: AiOrderingConversationEntity | null,
): AiOrderingGuestConversationDto {
  return { turns: (conversation?.turns ?? []).map(toAiOrderingGuestTurnDto) };
}

function countUnanswered(conversation: AiOrderingConversationEntity): number {
  return conversation.turns.filter(
    (turn) => turn.response.type === 'unanswered',
  ).length;
}

export function toAiOrderingConversationSummaryDto(
  conversation: AiOrderingConversationEntity,
): AiOrderingConversationSummaryDto {
  const lastTurn = conversation.turns.at(-1);

  const dto: AiOrderingConversationSummaryDto = {
    id: conversation.id,
    cartId: conversation.cartId,
    participantId: conversation.participantId,
    turnCount: conversation.turns.length,
    unansweredCount: countUnanswered(conversation),
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };

  if (lastTurn) {
    dto.lastTurnAt = lastTurn.createdAt.toISOString();
  }

  return dto;
}

export function toAiOrderingConversationDetailDto(
  conversation: AiOrderingConversationEntity,
): AiOrderingConversationDetailDto {
  const dto: AiOrderingConversationDetailDto = {
    id: conversation.id,
    storeId: conversation.storeId,
    cartId: conversation.cartId,
    participantId: conversation.participantId,
    turns: conversation.turns.map(toAiOrderingReviewTurnDto),
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };

  if (conversation.summary !== undefined) {
    dto.summary = conversation.summary;
  }

  return dto;
}

/**
 * Flattens the `unanswered` turns of one conversation into review entries.
 *
 * A turn, not a conversation, is the unit here: the merchant is reading a list
 * of questions, and two unanswered questions in one conversation are two things
 * to fix.
 */
export function toAiOrderingUnansweredEntryDtos(
  conversation: AiOrderingConversationEntity,
): AiOrderingUnansweredEntryDto[] {
  const entries: AiOrderingUnansweredEntryDto[] = [];

  for (const turn of conversation.turns) {
    if (turn.response.type !== 'unanswered') {
      continue;
    }

    const entry: AiOrderingUnansweredEntryDto = {
      conversationId: conversation.id,
      turnId: turn.id,
      participantId: conversation.participantId,
      message: turn.message,
      reply: turn.response.reply,
      reason: turn.response.reason,
      createdAt: turn.createdAt.toISOString(),
    };

    if (turn.response.productId !== undefined) {
      entry.productId = turn.response.productId;
    }

    entries.push(entry);
  }

  return entries;
}
