import { cartModel } from '@/models/cart';

import type {
  AiOrderingChoiceDtoType,
  AiOrderingConversationDetail,
  AiOrderingConversationDetailDtoType,
  AiOrderingConversationSummary,
  AiOrderingConversationSummaryDtoType,
  AiOrderingReviewTurn,
  AiOrderingReviewTurnDtoType,
  AiOrderingUnansweredEntry,
  AiOrderingUnansweredEntryDtoType,
  AiOrderingChoiceModel,
  AiOrderingOperationModel,
  AiOrderingResponseDtoType,
  AiOrderingResponseModel,
  AiOrderingGuestConversationDtoType,
  AiOrderingProposalDecision,
  AiOrderingProposalDecisionResult,
  AiOrderingTranscriptTurn,
  AiOrderingTurn,
  AiOrderingTurnDtoType,
  AiOrderingUnansweredModel,
} from './types';

type AddItemOperation = Extract<AiOrderingOperationModel, { type: 'add_item' }>;
type UpdateItemOperation = Extract<
  AiOrderingOperationModel,
  { type: 'update_own_item' }
>;

function deserializeChoice(
  dto: AiOrderingChoiceDtoType,
): AiOrderingChoiceModel {
  const choice: AiOrderingChoiceModel = { id: dto.id, label: dto.label };

  if (dto.description !== undefined) choice.description = dto.description;

  return choice;
}

function deserializeSelectedOptions(
  options: { modifierId: string; optionId: string }[],
) {
  return options.map((option) => ({
    modifierId: option.modifierId,
    optionId: option.optionId,
  }));
}

/**
 * Operations are the one part of a response the client sends back out: an
 * accepted row becomes a cart request. So every field the cart accepts has to
 * survive deserialization, and `requestMapper` turns the survivor into a request.
 */
function deserializeOperation(
  dto: AiOrderingOperationModel,
): AiOrderingOperationModel {
  switch (dto.type) {
    case 'remove_own_item':
      return {
        type: dto.type,
        operationId: dto.operationId,
        summary: dto.summary,
        itemId: dto.itemId,
      };

    case 'update_own_item': {
      const item: UpdateItemOperation['item'] = {};

      if (dto.item.quantity !== undefined) item.quantity = dto.item.quantity;
      if (dto.item.selectedOptions !== undefined) {
        item.selectedOptions = deserializeSelectedOptions(
          dto.item.selectedOptions,
        );
      }
      if (dto.item.notes !== undefined) item.notes = dto.item.notes;

      return {
        type: dto.type,
        operationId: dto.operationId,
        summary: dto.summary,
        itemId: dto.itemId,
        item,
      };
    }

    case 'add_item': {
      const item: AddItemOperation['item'] = {
        productId: dto.item.productId,
        quantity: dto.item.quantity,
      };

      if (dto.item.selectedOptions !== undefined) {
        item.selectedOptions = deserializeSelectedOptions(
          dto.item.selectedOptions,
        );
      }
      if (dto.item.notes !== undefined) item.notes = dto.item.notes;

      return {
        type: dto.type,
        operationId: dto.operationId,
        summary: dto.summary,
        item,
      };
    }
  }
}

export const aiOrderingModel = {
  /**
   * The response union is deserialized variant by variant rather than passed
   * through, because the field allowlist is what keeps a server-side addition
   * from reaching the panel unnoticed. An unknown variant cannot arrive: the
   * union is closed in the shared contract.
   */
  deserializeResponse(dto: AiOrderingResponseDtoType): AiOrderingResponseModel {
    switch (dto.type) {
      case 'message':
        return { type: dto.type, reply: dto.reply };

      case 'choices':
        return {
          type: dto.type,
          reply: dto.reply,
          promptId: dto.promptId,
          question: dto.question,
          inputMode: dto.inputMode,
          options: dto.options.map(deserializeChoice),
          ...(dto.additionalQuestions !== undefined
            ? {
                additionalQuestions: dto.additionalQuestions.map((entry) => ({
                  question: entry.question,
                  options: entry.options.map(deserializeChoice),
                })),
              }
            : {}),
          allowFreeText: dto.allowFreeText,
        };

      case 'proposal':
        return {
          type: dto.type,
          reply: dto.reply,
          proposalId: dto.proposalId,
          confirmationRequired: dto.confirmationRequired,
          operations: dto.operations.map(deserializeOperation),
        };

      case 'unanswered': {
        const unanswered: AiOrderingUnansweredModel = {
          type: dto.type,
          reply: dto.reply,
          reason: dto.reason,
        };

        if (dto.productId !== undefined) unanswered.productId = dto.productId;

        return unanswered;
      }
    }
  },

  deserializeTurn(dto: AiOrderingTurnDtoType): AiOrderingTurn {
    return {
      versionId: dto.versionId,
      response: aiOrderingModel.deserializeResponse(dto.response),
      // Carried through as the server wrote it. These results belong to an
      // EARLIER entry in the transcript, not to this turn, which is why the
      // proposal id travels with them.
      ...(dto.settledProposal !== undefined
        ? { settledProposal: dto.settledProposal }
        : {}),
    };
  },

  /**
   * The guest's stored transcript, oldest turn first.
   *
   * Field by field like every other deserializer here, so a field added to the
   * guest DTO cannot reach the panel without someone deciding it should.
   */
  deserializeTranscript(
    dto: AiOrderingGuestConversationDtoType,
  ): AiOrderingTranscriptTurn[] {
    return dto.turns.map((turn) => ({
      id: turn.id,
      message: turn.message,
      versionId: turn.versionId,
      createdAt: turn.createdAt,
      response: aiOrderingModel.deserializeResponse(turn.response),
      // Carried through as the server recorded it. The panel draws a proposal
      // from this rather than guessing from its position in the transcript.
      ...(turn.proposal ? { proposal: turn.proposal } : {}),
    }));
  },

  /**
   * A decision's results, the cart it produced, and the assistant's closing
   * reply. The cart is deserialized through the cart model so no raw DTO
   * escapes this boundary.
   */
  deserializeProposalDecision(
    dto: AiOrderingProposalDecision,
  ): AiOrderingProposalDecisionResult {
    return {
      proposalId: dto.proposalId,
      results: dto.results,
      cart: cartModel.deserialize(dto.cart),
      ...(dto.reply !== undefined ? { reply: dto.reply } : {}),
    };
  },

  deserializeConversationSummary(
    dto: AiOrderingConversationSummaryDtoType,
  ): AiOrderingConversationSummary {
    const summary: AiOrderingConversationSummary = {
      id: dto.id,
      cartId: dto.cartId,
      participantId: dto.participantId,
      turnCount: dto.turnCount,
      unansweredCount: dto.unansweredCount,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };

    if (dto.lastTurnAt !== undefined) summary.lastTurnAt = dto.lastTurnAt;

    return summary;
  },

  deserializeReviewTurn(
    dto: AiOrderingReviewTurnDtoType,
  ): AiOrderingReviewTurn {
    const turn: AiOrderingReviewTurn = {
      id: dto.id,
      message: dto.message,
      response: aiOrderingModel.deserializeResponse(dto.response),
      versionId: dto.versionId,
      versionFingerprint: dto.versionFingerprint,
      provider: dto.provider,
      modelName: dto.modelName,
      repairAttempted: dto.repairAttempted,
      droppedOperationCount: dto.droppedOperationCount,
      ownershipViolationCount: dto.ownershipViolationCount,
      createdAt: dto.createdAt,
    };

    if (dto.repairSucceeded !== undefined) {
      turn.repairSucceeded = dto.repairSucceeded;
    }

    // Carried through unchanged rather than reshaped. The backend already
    // narrowed the raw reply into a declared shape, and the review surface's
    // whole purpose for it is to show what was sent, not a reading of it.
    if (dto.modelOutput !== undefined) {
      turn.modelOutput = dto.modelOutput;
    }

    if (dto.modelTrace !== undefined) {
      turn.modelTrace = dto.modelTrace;
    }

    return turn;
  },

  deserializeConversationDetail(
    dto: AiOrderingConversationDetailDtoType,
  ): AiOrderingConversationDetail {
    const detail: AiOrderingConversationDetail = {
      id: dto.id,
      storeId: dto.storeId,
      cartId: dto.cartId,
      participantId: dto.participantId,
      turns: dto.turns.map(aiOrderingModel.deserializeReviewTurn),
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };

    if (dto.summary !== undefined) detail.summary = dto.summary;

    // Sent only to platform staff; absent for everyone else.
    if (dto.promptPreludes !== undefined) {
      detail.promptPreludes = dto.promptPreludes;
    }

    return detail;
  },

  deserializeUnansweredEntry(
    dto: AiOrderingUnansweredEntryDtoType,
  ): AiOrderingUnansweredEntry {
    const entry: AiOrderingUnansweredEntry = {
      conversationId: dto.conversationId,
      turnId: dto.turnId,
      participantId: dto.participantId,
      message: dto.message,
      reply: dto.reply,
      reason: dto.reason,
      createdAt: dto.createdAt,
    };

    if (dto.productId !== undefined) entry.productId = dto.productId;

    return entry;
  },
};
