/**
 * Conversation entities to the DTOs the merchant review surface and the guest's
 * own transcript read.
 *
 * Everything here is a narrowing. The GUEST sees what they were shown. The
 * MERCHANT sees that, plus the signals that explain it, plus what the model
 * actually answered — `modelOutput`, projected into a declared shape rather
 * than passed through raw.
 *
 * That last part was once withheld on the grounds that the raw provider reply
 * is not a stable shape. True, and the reason the projection exists; but
 * withholding it entirely meant every question of the form "the assistant said
 * it would do X and X did not happen" could only be answered by reading the
 * database by hand. The reviewer needs to see the model's own answer, so the
 * contract declares a narrow view of it and `toAiOrderingModelOutputDto` below
 * refuses anything that does not fit.
 */

import type {
  AiOrderingConversationDetailDto,
  AiOrderingConversationSummaryDto,
  AiOrderingGuestConversationDto,
  AiOrderingGuestTurnDto,
  AiOrderingModelOutputDto,
  AiOrderingModelTraceDto,
  AiOrderingProposalStateDto,
  AiOrderingReviewTurnDto,
  AiOrderingUnansweredEntryDto,
} from '@repo/shared';
import type {
  AiOrderingConversationEntity,
  AiOrderingTurnSnapshot,
} from '@src/models/aiOrdering/model';

/**
 * The stored raw reply, as the review DTO declares it — or nothing.
 *
 * `modelOutput` is `unknown` on the entity and `Mixed` in Mongo, so this is the
 * one place the shape is asserted. A value that does not fit is dropped rather
 * than coerced or passed through: a reviewer reading a half-recognized object
 * would be reading the runtime's internals, which is what the raw field was
 * withheld to prevent. Dropping it shows as "nothing recorded", which is
 * honest, and the full value is still in the database for a replay.
 *
 * `args` is carried through untouched. Every tool has its own argument shape,
 * validating them here would duplicate the gate, and the reviewer's interest is
 * precisely in the arguments that FAILED validation.
 */
function toAiOrderingModelOutputDto(
  value: unknown,
): AiOrderingModelOutputDto | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const { toolCalls, text } = value as {
    toolCalls?: unknown;
    text?: unknown;
  };

  if (!Array.isArray(toolCalls) || typeof text !== 'string') {
    return undefined;
  }

  const calls: AiOrderingModelOutputDto['toolCalls'] = [];

  for (const call of toolCalls) {
    if (typeof call !== 'object' || call === null) {
      return undefined;
    }

    const { name, args } = call as { name?: unknown; args?: unknown };

    if (typeof name !== 'string') {
      return undefined;
    }

    calls.push({ name, args });
  }

  return { toolCalls: calls, text };
}

/**
 * The stored trace, held to its declared shape for the same reason the raw
 * reply is: a call that does not fit is dropped, not passed through.
 */
function toAiOrderingModelTraceDto(
  value: unknown,
): AiOrderingModelTraceDto | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const { currentTurn, calls } = value as {
    currentTurn?: unknown;
    calls?: unknown;
  };

  if (typeof currentTurn !== 'string' || !Array.isArray(calls)) {
    return undefined;
  }

  const trace: AiOrderingModelTraceDto = { currentTurn, calls: [] };

  for (const call of calls as unknown[]) {
    if (typeof call !== 'object' || call === null) {
      continue;
    }

    const { toolNames, feedback, output, error } = call as {
      toolNames?: unknown;
      feedback?: unknown;
      output?: unknown;
      error?: unknown;
    };
    const outputDto = toAiOrderingModelOutputDto(output);

    trace.calls.push({
      toolNames: Array.isArray(toolNames)
        ? toolNames.filter((name): name is string => typeof name === 'string')
        : [],
      ...(typeof feedback === 'string' ? { feedback } : {}),
      ...(outputDto !== undefined ? { output: outputDto } : {}),
      ...(typeof error === 'string' ? { error } : {}),
    });
  }

  return trace;
}

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

  const modelOutput = toAiOrderingModelOutputDto(turn.modelOutput);

  if (modelOutput !== undefined) {
    dto.modelOutput = modelOutput;
  }

  const modelTrace = toAiOrderingModelTraceDto(turn.modelTrace);

  if (modelTrace !== undefined) {
    dto.modelTrace = modelTrace;
  }

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
    // Present exactly when the turn carried a proposal. Without it a reloaded
    // panel cannot tell an applied proposal from one still waiting, and would
    // have to guess — which is how a guest ends up being told to ask again for
    // something already in their cart.
    ...(turn.proposal
      ? { proposal: toAiOrderingProposalStateDto(turn.proposal) }
      : {}),
    versionId: turn.versionId,
    createdAt: turn.createdAt.toISOString(),
  };
}

/**
 * Two states, not three.
 *
 * A lapsed proposal is a decided one whose operations are all `superseded`, so
 * `pending` means exactly one thing to the panel: there is still something to
 * accept. Expiry is resolved before this point, never here.
 */
function toAiOrderingProposalStateDto(
  proposal: NonNullable<AiOrderingTurnSnapshot['proposal']>,
): AiOrderingProposalStateDto {
  if (!proposal.decision) {
    return { status: 'pending' };
  }

  return {
    status: 'decided',
    decidedAt: proposal.decision.decidedAt.toISOString(),
    results: proposal.decision.results,
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
