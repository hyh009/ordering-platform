import { randomUUID } from 'node:crypto';

import { AI_ORDERING_MAX_TURNS_PER_CONVERSATION } from '@src/models/aiOrdering/model';
import { AiOrderingConversationMongoModel } from '@src/models/aiOrdering/mongo';
import { ConflictError } from '@src/utils/errors';

import type {
  AiOrderingConversationEntity,
  AiOrderingTurnSnapshot,
} from '@src/models/aiOrdering/model';
import type {
  CreateAiOrderingConversationInput,
  FindAiOrderingConversationInput,
  UpdateAiOrderingSummaryInput,
} from '@src/repositories/aiOrdering/repository';

const aiOrderingConversationEntityKeys = [
  'id',
  'organizationId',
  'storeId',
  'cartId',
  'participantId',
  'summary',
  'summarizedUpToTurnIndex',
  'turns',
  'createdAt',
  'updatedAt',
] as const satisfies readonly (keyof AiOrderingConversationEntity)[];

const aiOrderingConversationEntityKeyCoverage: Record<
  Exclude<
    keyof AiOrderingConversationEntity,
    (typeof aiOrderingConversationEntityKeys)[number]
  >,
  never
> = {};

function toAiOrderingConversationEntity(
  doc: AiOrderingConversationEntity,
): AiOrderingConversationEntity {
  void aiOrderingConversationEntityKeyCoverage;

  return Object.fromEntries(
    aiOrderingConversationEntityKeys.map((key) => [key, doc[key]]),
  ) as AiOrderingConversationEntity;
}

export const aiOrderingMongoRepository = {
  async findByParticipant(input: FindAiOrderingConversationInput) {
    const doc = await AiOrderingConversationMongoModel.findOne({
      storeId: input.storeId,
      cartId: input.cartId,
      participantId: input.participantId,
    })
      .lean<AiOrderingConversationEntity>()
      .exec();

    return doc ? toAiOrderingConversationEntity(doc) : null;
  },

  async create(input: CreateAiOrderingConversationInput) {
    const doc = new AiOrderingConversationMongoModel({
      id: `ai-conversation-${randomUUID()}`,
      organizationId: input.organizationId,
      storeId: input.storeId,
      cartId: input.cartId,
      participantId: input.participantId,
      turns: [],
    });

    await doc.save();

    return toAiOrderingConversationEntity(doc.toObject());
  },

  async appendTurn(conversationId: string, turn: AiOrderingTurnSnapshot) {
    // The ceiling is enforced inside the filter rather than by reading the
    // document first and checking its length: requiring the slot at the ceiling
    // index to be absent makes the cap atomic, so two concurrent appends cannot
    // both pass a check and push past it.
    const doc = await AiOrderingConversationMongoModel.findOneAndUpdate(
      {
        id: conversationId,
        [`turns.${AI_ORDERING_MAX_TURNS_PER_CONVERSATION - 1}`]: {
          $exists: false,
        },
      },
      { $push: { turns: turn } },
      { new: true },
    )
      .lean<AiOrderingConversationEntity>()
      .exec();

    if (doc) {
      return toAiOrderingConversationEntity(doc);
    }

    // No match means either the conversation is gone or it is full. These are
    // different outcomes for the caller, so distinguish them rather than
    // collapsing both into `null`.
    const exists = await AiOrderingConversationMongoModel.exists({
      id: conversationId,
    });

    if (!exists) {
      return null;
    }

    throw new ConflictError(
      `AI ordering conversation "${conversationId}" has reached its limit of ${AI_ORDERING_MAX_TURNS_PER_CONVERSATION} turns.`,
    );
  },

  async updateSummary(input: UpdateAiOrderingSummaryInput) {
    const doc = await AiOrderingConversationMongoModel.findOneAndUpdate(
      { id: input.conversationId },
      {
        $set: {
          summary: input.summary,
          summarizedUpToTurnIndex: input.summarizedUpToTurnIndex,
        },
      },
      { new: true },
    )
      .lean<AiOrderingConversationEntity>()
      .exec();

    return doc ? toAiOrderingConversationEntity(doc) : null;
  },
};
