/**
 * Conversation entities to the DTOs the merchant review surface reads.
 *
 * Everything here is a narrowing. `modelOutput` in particular never crosses this
 * boundary: it is the raw provider reply, kept for replay and evaluation, and it
 * is neither a stable shape nor something a backstage reader should depend on.
 * The merchant sees what the GUEST saw, plus the signals that explain it.
 */

import type {
  AiOrderingConversationDetailDto,
  AiOrderingConversationSummaryDto,
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
