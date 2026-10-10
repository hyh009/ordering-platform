import {
  AI_ORDERING_MAX_CHOICE_OPTIONS,
  AI_ORDERING_MAX_SHOWN_PRODUCTS,
  aiOrderingUnansweredReasons,
  cartItemInputSchema,
  cartItemParamsSchema,
  updateCartItemSchema,
} from '@repo/shared';
import { describeProposalChoices } from '@src/modules/aiOrdering/openChoices';
import { buildAiOrderingOperationLabel } from '@src/modules/aiOrdering/operationLabel';
import { z } from 'zod';

import type {
  AiOrderingChoiceGroup,
  AiOrderingOperation,
  AiOrderingResponse,
} from '@repo/shared';
import type { AiOrderingLabelContext } from '@src/modules/aiOrdering/operationLabel';

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

/**
 * Re-declares an object's fields with descriptions attached.
 *
 * The field schemas themselves come from the object being described, so the
 * shapes stay single-sourced — in particular the cart request schemas keep one
 * definition, shared with the guest cart API, and only gain prose on this side.
 * Writing descriptions onto the shared contract instead would put wording aimed
 * at a language model into what the cart routes validate against.
 */
function describeFields<Shape extends z.ZodRawShape>(
  schema: z.ZodObject<Shape>,
  descriptions: { [Key in keyof Shape]: string },
): z.ZodObject<Shape> {
  const described = Object.fromEntries(
    Object.entries(schema.shape).map(([key, field]) => [
      key,
      (field as z.ZodType).describe(descriptions[key as keyof Shape]),
    ]),
  ) as unknown as Shape;

  // `safeExtend`, not `extend`: zod refuses to overwrite keys on an object that
  // carries refinements, and the cart's update schema carries one. The cast is
  // because re-declaring every key with the SAME field schema cannot change the
  // shape, which zod's extend typing has no way to express.
  return schema.safeExtend(described as never) as unknown as z.ZodObject<Shape>;
}

const modelReplyDescription =
  'What you say to the guest, in their own language. One or two short sentences. Do not restate the operations here; they are shown to the guest as their own list.';

const modelReplySchema = z
  .string()
  .trim()
  .min(1)
  .describe(modelReplyDescription);

const modelChoiceSchema = describeFields(
  z.object({
    label: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(240).optional(),
  }),
  {
    label: 'The option as the guest should read it, in their own language.',
    description:
      'Optional one-line clarification, only when the label alone is ambiguous.',
  },
);

/**
 * The selection array, with its element described.
 *
 * Rebuilt here rather than reused wholesale because the element's own fields
 * need describing too, and a description has to sit on the schema the provider
 * is shown. The uniqueness rule the cart enforces is not repeated: validation
 * against the real menu is what rejects a bad selection, and a second copy of
 * that rule here could drift from it.
 */
const modelSelectedOptionsSchema = z
  .array(
    describeFields(
      z.object({
        modifierId: z.string().trim().min(1).max(120),
        optionId: z.string().trim().min(1).max(120),
      }),
      {
        modifierId:
          'The id of the modifier group this choice answers, copied from the menu data. Never a name.',
        optionId:
          'The id of the chosen option within that group, copied from the menu data. Never a name.',
      },
    ),
  )
  .max(50);

const SELECTED_OPTIONS_DESCRIPTION =
  'Only the choices the guest has actually stated, as id pairs from the menu. Leave out every choice they have not made: the ordering page asks them for those, so you do not have to and must never pick one for them. Omit the field entirely when they have stated none.';

/**
 * What a note IS, written in the field that carries it.
 *
 * Stated as the ONE kind of thing a note admits, with a test the model can
 * apply, rather than as a list of what to keep out. The list came first and the
 * list is why this had to be rewritten: it named an extra ingredient, a side and
 * anything the store sells, and a modifier choice is none of those, so nothing
 * stopped a sweetness or a spice level from being written in a note as well as
 * chosen properly — and a note reaches the kitchen ticket. A prohibition list
 * can always be one case short; a closed definition cannot.
 *
 * The example of a spice level is gone from here for the same reason. It read as
 * permission for exactly the duplication above wherever a store has a spice
 * modifier, which is most of them.
 *
 * The closed definition turns on what a note DOES to the item: it takes away or
 * adjusts, and never adds. An earlier version of it asked only whether the
 * request was about how the item is prepared, which an added egg passes — the
 * assistant wrote one into a note for a store with no egg on the menu, which is
 * the mistake the old prohibition list did catch. Add and take away is the line
 * the framing already draws, since nothing extra is made for a note.
 *
 * The framing is kept: a note is passed along as a request and is not part of
 * what was ordered, it has no price, nothing is charged or made for it, and the
 * store may decline it. That is what explains why so little fits, so the routing
 * that follows reads as a consequence rather than as a rule to remember.
 */
const NOTES_DESCRIPTION_BASE =
  "A note can never ADD anything to the item: not an extra ingredient, not an extra portion, not a side, not rice, not anything else the store sells. Anything the guest wants added is a choice on the product, or a separate product added to the cart — search the menu for it before you consider a note at all, because nothing is made for a note and an addition written in one is an addition the guest never gets. When the store offers it neither way it is not available: say so in your reply and write no note. What a note DOES carry is one kind of thing: a request that takes something away from THIS item or adjusts how it is made — an ingredient left out, how done something should be, an allergy the kitchen has to know about. It is passed to the store as a request and is not part of the order: it has no price, nothing is charged for it, and the store may not be able to honor it. Write one only when the guest asked for it, it puts nothing new on the plate, and no choice on this product can express it; otherwise leave the field out. A choice the product offers belongs in its own choices field, whatever it is and however the guest phrased it.";

const NOTES_ON_ADD_DESCRIPTION = `${NOTES_DESCRIPTION_BASE} This is the only field that records a preparation request: writing it in your reply instead does not record it. When a change carries a note, say in your reply that it is a request the store may not be able to meet, and that the guest should confirm it with the staff.`;

const modelAddItemSchema = describeFields(
  cartItemInputSchema.safeExtend({
    selectedOptions: modelSelectedOptionsSchema.optional(),
  }),
  {
    productId:
      'The id of the product to add, copied from the menu data. Never a name.',
    quantity: 'How many of this product to add.',
    selectedOptions: SELECTED_OPTIONS_DESCRIPTION,
    notes: NOTES_ON_ADD_DESCRIPTION,
  },
);

const modelUpdateItemSchema = describeFields(
  updateCartItemSchema.safeExtend({
    selectedOptions: modelSelectedOptionsSchema.optional(),
  }),
  {
    quantity:
      'The new quantity. Omit to leave the quantity as it is. The update must change something, so do not repeat the value the item already has.',
    selectedOptions:
      'The complete new set of choices, replacing the current ones. Omit to leave the choices as they are.',
    notes: `${NOTES_DESCRIPTION_BASE} Omit to leave the current note untouched; send null to erase it. These are opposite: omitting is not how you clear a note.`,
  },
);

const OPERATION_TYPE_DESCRIPTION =
  'Which change this is: add_item adds one more of a product on top of whatever the cart already holds, update_own_item changes an item already there, remove_own_item takes one out.';

const ITEM_ID_DESCRIPTION =
  'The id of the cart item to change, copied from the cart data. Never a product id and never a name.';

const modelOperationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('add_item').describe(OPERATION_TYPE_DESCRIPTION),
    item: modelAddItemSchema.describe('The product to add, and how.'),
  }),
  z.object({
    type: z.literal('update_own_item').describe(OPERATION_TYPE_DESCRIPTION),
    itemId: cartItemParamsSchema.shape.itemId.describe(ITEM_ID_DESCRIPTION),
    item: modelUpdateItemSchema.describe(
      'Only the parts of the item that change. Anything you leave out stays as it is.',
    ),
  }),
  z.object({
    type: z.literal('remove_own_item').describe(OPERATION_TYPE_DESCRIPTION),
    itemId: cartItemParamsSchema.shape.itemId.describe(ITEM_ID_DESCRIPTION),
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
  choices: describeFields(
    z.object({
      reply: modelReplySchema,
      question: z.string().trim().min(1).max(500),
      inputMode: z.enum(['single_choice', 'yes_no']),
      options: z
        .array(modelChoiceSchema)
        .min(1)
        .max(AI_ORDERING_MAX_CHOICE_OPTIONS),
    }),
    {
      reply: modelReplyDescription,
      question:
        'The one thing you need the guest to clarify, in their own language. One thing only: never combine two into one question, and a turn asks one question, so clarify the thing that blocks you most.',
      inputMode:
        'yes_no when the question has exactly two opposite answers, single_choice otherwise.',
      options:
        'The answers to offer, at most 5, and never a list cut short to fit. The guest may also type something else, so these need not be exhaustive. When more things could be meant than fit here, show them with show_products instead: a question that offers five of twelve hides seven of the answers.',
    },
  ),
  products: describeFields(
    z.object({
      reply: modelReplySchema,
      categoryId: z.string().trim().min(1).max(120).optional(),
      productIds: z
        .array(z.string().trim().min(1).max(120))
        .min(1)
        .max(AI_ORDERING_MAX_SHOWN_PRODUCTS)
        .optional(),
    }),
    {
      reply: modelReplyDescription,
      categoryId:
        'The id of ONE category, when the guest should see what it holds. Every product in it is shown, however many there are. Use this whenever the guest is asking about a whole kind of thing.',
      productIds:
        'The ids of the products to show, at most 8, when they do not form one category. Supply this or categoryId, never both and never neither. Each id is copied from the menu data; a name is not an id.',
    },
  ),
  proposal: describeFields(
    z.object({
      reply: modelReplySchema,
      operations: z.array(modelOperationSchema).min(1),
    }),
    {
      reply: modelReplyDescription,
      operations:
        'Every cart change you are proposing, as one list the guest accepts, edits, or dismisses together. Each entry must carry the whole change in its own fields: anything described only in your reply does not happen.',
    },
  ),
  unanswered: describeFields(
    z.object({
      reply: modelReplySchema,
      reason: z.enum(aiOrderingUnansweredReasons),
      productId: z.string().trim().min(1).max(120).optional(),
    }),
    {
      reply: modelReplyDescription,
      reason:
        'Why you cannot answer: missing_product_info when the store data lacks the detail, out_of_scope when the question is not about ordering here, unclear_request when you could not tell what was asked.',
      productId:
        'The product the missing detail belongs to, when the reason is missing_product_info and the product is known. This is what tells the merchant which description to improve.',
    },
  ),
} as const;

export const aiOrderingModelResponseSchema = z.discriminatedUnion('type', [
  aiOrderingModelArgumentSchemas.message.extend({
    type: z.literal('message'),
  }),
  aiOrderingModelArgumentSchemas.choices.extend({
    type: z.literal('choices'),
  }),
  aiOrderingModelArgumentSchemas.products.extend({
    type: z.literal('products'),
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
  /**
   * What the per-operation label is derived from.
   *
   * The caller already holds these for validation, so nothing extra is loaded.
   * Hydration stays pure: the same operation against the same menu and cart
   * produces the same label.
   */
  label: AiOrderingLabelContext;
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

    case 'products': {
      // A category resolves to its products here, in menu order, so the client
      // is handed one list and never has to know which of the two the model
      // named. Validation has already established that the category exists and
      // holds something, so an empty list cannot reach this point.
      const productIds =
        modelResponse.categoryId !== undefined
          ? context.label.menu.groups
              .filter((group) => group.category?.id === modelResponse.categoryId)
              .flatMap((group) => group.products.map((product) => product.id))
          : (modelResponse.productIds ?? []);

      return {
        type: 'products',
        reply: modelResponse.reply,
        productIds,
        // Kept so the panel can name where the set came from, and so a stored
        // turn still says whether the model picked or pointed.
        ...(modelResponse.categoryId !== undefined
          ? { categoryId: modelResponse.categoryId }
          : {}),
      };
    }

    case 'proposal':
      return {
        type: 'proposal',
        reply: modelResponse.reply,
        proposalId: context.newId('proposal'),
        confirmationRequired: context.confirmationRequired,
        operations: modelResponse.operations.map((operation, index) => {
          const hydrated = {
            ...operation,
            operationId: `op-${String(index + 1)}`,
          } as AiOrderingOperation;
          const choices = describeChoicesForOperation(hydrated, context.label);

          return {
            ...hydrated,
            // Backend-authored, like every other field the model may not emit.
            summary: buildAiOrderingOperationLabel(hydrated, context.label),
            ...(choices.length > 0
              ? {
                  choices,
                  summaryWithoutChoices: buildAiOrderingOperationLabel(
                    hydrated,
                    context.label,
                    { omitChoices: true },
                  ),
                }
              : {}),
          };
        }),
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

/**
 * Every choice the product behind a proposed operation offers, with what will
 * be selected for each once the operation runs.
 *
 * A removal has nothing to choose. An update describes the item as it will BE:
 * the options it sets when it sets them, otherwise the ones the cart item
 * already carries — an update's `selectedOptions` replaces the whole set, so
 * those are the only two states there are. Describing the result rather than
 * the change is what lets the guest correct a choice on an item whose quantity
 * is all the assistant meant to touch.
 */
function describeChoicesForOperation(
  operation: AiOrderingOperation,
  label: AiOrderingLabelContext,
): AiOrderingChoiceGroup[] {
  if (operation.type === 'remove_own_item') {
    return [];
  }

  if (operation.type === 'update_own_item') {
    const item = label.cart.items.find(
      (candidate) => candidate.id === operation.itemId,
    );

    return item
      ? describeProposalChoices({
          productId: item.productId,
          selections: operation.item.selectedOptions ?? item.selectedOptions,
          menu: label.menu,
          locale: label.locale,
        })
      : [];
  }

  return describeProposalChoices({
    productId: operation.item.productId,
    selections: operation.item.selectedOptions ?? [],
    menu: label.menu,
    locale: label.locale,
  });
}
