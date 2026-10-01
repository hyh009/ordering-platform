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
 * The model reaches this shape by CALLING A TOOL (see `tools.ts`): the tool name
 * supplies `type` and the tool arguments supply the rest. The narrowing below is
 * therefore what the tool argument schemas narrow, and the reasoning is unchanged
 * by the transport.
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

/**
 * The argument schemas for the assistant's tools — one per response type that a
 * tool carries.
 *
 * These are the SAME shapes the response union is built from, minus `type`: the
 * tool NAME is the discriminator, so repeating it in the arguments would give the
 * model a second, contradictable way to say what it already said by choosing a
 * tool. `tools.ts` binds these; the output gate puts `type` back from the tool
 * name and parses the result through the union below, so there is one schema per
 * response type and not two.
 */
export const aiOrderingModelArgumentSchemas = {
  message: z.object({
    reply: modelReplySchema,
  }),
  choices: z.object({
    reply: modelReplySchema,
    question: z.string().trim().min(1).max(500),
    inputMode: z.enum(['single_choice', 'yes_no']),
    options: z.array(modelChoiceSchema).min(1).max(8),
  }),
  proposal: z.object({
    reply: modelReplySchema,
    operations: z.array(modelOperationSchema).min(1),
  }),
  unanswered: z.object({
    reply: modelReplySchema,
    reason: z.enum(aiOrderingUnansweredReasons),
    productId: z.string().trim().min(1).max(120).optional(),
  }),
} as const;

export const aiOrderingModelResponseSchema = z.discriminatedUnion('type', [
  aiOrderingModelArgumentSchemas.message.extend({
    type: z.literal('message'),
  }),
  aiOrderingModelArgumentSchemas.choices.extend({
    type: z.literal('choices'),
  }),
  aiOrderingModelArgumentSchemas.proposal.extend({
    type: z.literal('proposal'),
  }),
  aiOrderingModelArgumentSchemas.unanswered.extend({
    type: z.literal('unanswered'),
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
