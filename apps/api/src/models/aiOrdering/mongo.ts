import { aiOrderingOperationOutcomes } from '@repo/shared';
import { AI_ORDERING_MAX_TURNS_PER_CONVERSATION } from '@src/models/aiOrdering/model';
import { model, models, Schema } from 'mongoose';

import type { AiOrderingChoice, AiOrderingOperationResult } from '@repo/shared';
import type {
  AiOrderingConversationEntity,
  AiOrderingPromptSnapshot,
  AiOrderingProposalSnapshot,
  AiOrderingTurnQualitySignals,
  AiOrderingTurnSnapshot,
} from '@src/models/aiOrdering/model';
import type { Model } from 'mongoose';

const choiceSnapshotSchema = new Schema<AiOrderingChoice>(
  {
    id: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
  },
  { _id: false },
);

const promptSnapshotSchema = new Schema<AiOrderingPromptSnapshot>(
  {
    promptId: { type: String, required: true, trim: true },
    question: { type: String, required: true, trim: true },
    options: { type: [choiceSnapshotSchema], required: true },
  },
  { _id: false },
);

const proposalSnapshotSchema = new Schema<AiOrderingProposalSnapshot>(
  {
    proposalId: { type: String, required: true, trim: true },
    // Operations are a discriminated union already validated by the shared zod
    // schema before they reach persistence, so there is nothing for a Mongoose
    // sub-schema to add here beyond a second, driftable definition of the shape.
    // Stored as a single Mixed field holding the array rather than an array of
    // Mixed, which Mongoose's typed schema definitions do not accept.
    operations: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const operationResultSnapshotSchema = new Schema<AiOrderingOperationResult>(
  {
    operationId: { type: String, required: true, trim: true },
    outcome: {
      type: String,
      required: true,
      enum: aiOrderingOperationOutcomes,
    },
    failureCode: { type: String, trim: true },
  },
  { _id: false },
);

const qualitySignalsSchema = new Schema<AiOrderingTurnQualitySignals>(
  {
    repairAttempted: { type: Boolean, required: true, default: false },
    repairSucceeded: { type: Boolean },
    droppedOperationCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    ownershipViolationCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    cacheReadTokens: { type: Number, min: 0 },
  },
  { _id: false },
);

const turnSnapshotSchema = new Schema<AiOrderingTurnSnapshot>(
  {
    id: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    responseToPromptId: { type: String, trim: true },
    selectedOptionId: { type: String, trim: true },
    reportedOutcomes: { type: [operationResultSnapshotSchema] },
    versionId: { type: String, required: true, trim: true },
    provider: { type: String, required: true, trim: true },
    modelName: { type: String, required: true, trim: true },
    // Raw model output, stored even when validation rejected it: rejected output
    // is the most valuable row in the evaluation corpus. Untyped by definition.
    modelOutput: { type: Schema.Types.Mixed },
    // The hydrated response the guest saw. A discriminated union validated by the
    // shared schema before it is written. `turns.response.type` stays queryable,
    // which is what the merchant's unanswered-question listing filters on, so no
    // duplicate response-type field is stored alongside it.
    response: { type: Schema.Types.Mixed, required: true },
    prompt: { type: promptSnapshotSchema },
    proposal: { type: proposalSnapshotSchema },
    quality: { type: qualitySignalsSchema, required: true },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const aiOrderingConversationSchema = new Schema<AiOrderingConversationEntity>(
  {
    id: { type: String, required: true, trim: true },
    organizationId: { type: String, required: true, trim: true },
    storeId: { type: String, required: true, trim: true },
    cartId: { type: String, required: true, trim: true },
    participantId: { type: String, required: true, trim: true },
    summary: { type: String, trim: true },
    summarizedUpToTurnIndex: { type: Number, min: 0 },
    turns: {
      type: [turnSnapshotSchema],
      required: true,
      validate: {
        validator(value: AiOrderingTurnSnapshot[] | null | undefined) {
          return (value ?? []).length <= AI_ORDERING_MAX_TURNS_PER_CONVERSATION;
        },
        message: `A conversation cannot hold more than ${AI_ORDERING_MAX_TURNS_PER_CONVERSATION} turns.`,
      },
    },
  },
  {
    collection: 'aiOrderingConversations',
    id: false,
    timestamps: true,
  },
);

// Repository lookups go through the public id, and the public id must be unique.
aiOrderingConversationSchema.index({ id: 1 }, { unique: true });

// The lookup performed on every turn, and the database-level guarantee that one
// participant in one cart has exactly one conversation.
aiOrderingConversationSchema.index(
  { storeId: 1, cartId: 1, participantId: 1 },
  { unique: true },
);

// The merchant review listing: one store's conversations, newest first.
aiOrderingConversationSchema.index({ storeId: 1, createdAt: -1 });

// No TTL index, deliberately. Carts self-delete once `expiresAt` passes, but a
// conversation must outlive its cart: retention for merchant review and for
// prompt/model evaluation is the reason this collection exists.

export const AiOrderingConversationMongoModel =
  (models.AiOrderingConversation as
    | Model<AiOrderingConversationEntity>
    | undefined) ??
  model<AiOrderingConversationEntity>(
    'AiOrderingConversation',
    aiOrderingConversationSchema,
  );
