import {
  aiOrderingUnansweredReasons,
  cartItemInputSchema,
  cartItemParamsSchema,
  updateCartItemSchema,
} from '@repo/shared';
import { z } from 'zod';

import type { AiOrderingResponse } from '@repo/shared';

/**
 * The model-facing response schema — a backend internal, deliberately narrower
 * than the API contract in `packages/shared`.
 *
 * The model is asked only for what it alone can decide. Everything the backend
 * can determine is absent here and filled in by `hydrateAiOrderingResponse`,
 * because a field the model cannot emit is a field it cannot get wrong. That is
 * stronger than validating it afterwards.
 *
 * Absent on purpose:
 *
 * - `confirmationRequired` — resolved from the store setting AND the version's
 *   permission. If the model could emit it, a single `false` would bypass a
 *   store's confirmation step, which the spec forbids.
 * - `proposalId`, `promptId`, `operationId` — backend-generated, so the model can
 *   neither collide with an existing id nor invent one that resolves to nothing.
 * - `allowFreeText` — always true; answering a question by typing is never
 *   something the model gets to switch off.
 * - Choice option ids — the model supplies labels; the backend assigns the ids
 *   and stores the mapping, so the guest's later `selectedOptionId` always
 *   resolves against something the backend issued.
 *
 * Adding a field here is a claim that it cannot be computed from config, store
 * data, cart state, or the conversation.
 *
 * The model boundary is not an app boundary, so this schema stays out of
 * `packages/shared`.
 */

const modelReplySchema = z.string().trim().min(1);

const modelChoiceSchema = z.object({
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240).optional(),
});

const modelOperationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('add_item'),
    summary: z.string().trim().min(1).max(240),
    item: cartItemInputSchema,
  }),
  z.object({
    type: z.literal('update_own_item'),
    summary: z.string().trim().min(1).max(240),
    itemId: cartItemParamsSchema.shape.itemId,
    item: updateCartItemSchema,
  }),
  z.object({
    type: z.literal('remove_own_item'),
    summary: z.string().trim().min(1).max(240),
    itemId: cartItemParamsSchema.shape.itemId,
  }),
]);

export const aiOrderingModelResponseSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('message'),
    reply: modelReplySchema,
  }),
  z.object({
    type: z.literal('choices'),
    reply: modelReplySchema,
    question: z.string().trim().min(1).max(500),
    inputMode: z.enum(['single_choice', 'yes_no']),
    options: z.array(modelChoiceSchema).min(1).max(8),
  }),
  z.object({
    type: z.literal('proposal'),
    reply: modelReplySchema,
    operations: z.array(modelOperationSchema).min(1),
  }),
  z.object({
    type: z.literal('unanswered'),
    reply: modelReplySchema,
    reason: z.enum(aiOrderingUnansweredReasons),
    productId: z.string().trim().min(1).max(120).optional(),
  }),
]);

export type AiOrderingModelResponse = z.infer<
  typeof aiOrderingModelResponseSchema
>;
export type AiOrderingModelOperation = z.infer<typeof modelOperationSchema>;

export type AiOrderingHydrationContext = {
  /** Resolved from the store setting AND the version's permission, never the model. */
  confirmationRequired: boolean;
  newId: (prefix: string) => string;
};

/**
 * Expands a validated model response into the API-facing response, supplying
 * every backend-owned field.
 */
export function hydrateAiOrderingResponse(
  modelResponse: AiOrderingModelResponse,
  context: AiOrderingHydrationContext,
): AiOrderingResponse {
  switch (modelResponse.type) {
    case 'message':
      return { type: 'message', reply: modelResponse.reply };

    case 'choices':
      return {
        type: 'choices',
        reply: modelResponse.reply,
        promptId: context.newId('prompt'),
        question: modelResponse.question,
        inputMode: modelResponse.inputMode,
        options: modelResponse.options.map((option, index) => ({
          id: `option-${index + 1}`,
          label: option.label,
          ...(option.description !== undefined
            ? { description: option.description }
            : {}),
        })),
        allowFreeText: true,
      };

    case 'proposal':
      return {
        type: 'proposal',
        reply: modelResponse.reply,
        proposalId: context.newId('proposal'),
        confirmationRequired: context.confirmationRequired,
        operations: modelResponse.operations.map((operation, index) => ({
          ...operation,
          operationId: `op-${index + 1}`,
        })),
      };

    case 'unanswered':
      return {
        type: 'unanswered',
        reply: modelResponse.reply,
        reason: modelResponse.reason,
        ...(modelResponse.productId !== undefined
          ? { productId: modelResponse.productId }
          : {}),
      };
  }
}
