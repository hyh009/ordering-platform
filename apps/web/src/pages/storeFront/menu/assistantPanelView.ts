/**
 * The pure half of the assistant panel's VM: feature state in, render-ready
 * shape out.
 *
 * It lives beside `useAssistantPanelVM` rather than inside it because the web
 * workspace has no component-test environment, so the only way to test what the
 * panel will show is to test the shape it is handed. The hook keeps the parts
 * that need React — effects, handlers, command-result reactions.
 */

import type { PublicMenu, PublicProduct } from '@/models/storeFrontMenu';
import type {
  AiOrderingChoiceGroupModel,
  AiOrderingChoiceInputMode,
  AiOrderingChoiceModel,
  AiOrderingOperationModel,
  AiOrderingUnansweredReason,
} from '@/models/aiOrdering';
import type {
  AiOrderingProposalRowStatus,
  StoreFrontAiOrderingState,
} from '@/features/storeFront/aiOrdering/store';

export type AssistantEntryView =
  | { id: string; kind: 'guest'; text: string }
  | { id: string; kind: 'message'; reply: string }
  | {
      id: string;
      kind: 'choices';
      reply: string;
      question: string;
      inputMode: AiOrderingChoiceInputMode;
      options: AiOrderingChoiceModel[];
      promptId: string;
      /** Always true: a guest may type instead of picking. */
      allowsFreeText: boolean;
    }
  | {
      id: string;
      kind: 'products';
      reply: string;
      /**
       * The products to show, resolved against the menu the page already holds.
       *
       * The response carries ids and nothing else, so nothing on a card can
       * disagree with the menu page next to it. An id with no product here is
       * dropped rather than rendered empty — a menu loaded after the turn was
       * stored may no longer have it.
       */
      products: PublicProduct[];
    }
  | {
      id: string;
      kind: 'proposal';
      reply: string;
      proposalId: string;
      /** Always present, so a proposal reads as a list even with no live card. */
      operations: { operationId: string; summary: string }[];
      record: AssistantProposalRecord;
      /**
       * Per-operation results, present once the proposal has been decided.
       *
       * Drawn from what the server recorded rather than from the panel's
       * memory, so a reloaded transcript shows what actually happened instead
       * of telling a guest to ask again for something already in their cart.
       */
      results?: {
        operationId: string;
        outcome: string;
        failureCode?: string;
      }[];
      /**
       * What the assistant said once the proposal was decided.
       *
       * Separate from `reply`, which is what it said when it PROPOSED. Both are
       * shown, in the order they were said: a guest who confirms reads "請確認
       * 是否加入" and then what happened. Absent when nothing was attempted.
       */
      decidedReply?: string;
    }
  | {
      id: string;
      kind: 'unanswered';
      reply: string;
      reason: AiOrderingUnansweredReason;
    };

/**
 * What the guest is told about a failed row, as a presentation kind rather than
 * the raw failure reason.
 *
 * Several reasons collapse into one kind because the guest's situation is the
 * same even though the cause differs — `order-locked` and `store-closed` both
 * mean "this cart will not take changes any more" — and the panel should not
 * teach the guest the API's vocabulary.
 */
export type AssistantRowFailureKind =
  | 'sold-out'
  | 'off-menu'
  | 'item-gone'
  | 'options-changed'
  | 'cart-closed'
  | 'temporary'
  | 'unknown';

/**
 * Backend error code to the wording kind the guest reads.
 *
 * A partial map on purpose, with `unknown` as the fallback: these codes are the
 * API's whole error vocabulary, most of which a cart operation can never
 * produce, so an exhaustive table would be mostly noise asserting that
 * `USER_NOT_FOUND` is not a cart failure. What matters is that every code a cart
 * operation CAN produce is named here; `aiOrdering/cartExecution.ts` on the
 * backend is the list it has to stay in step with.
 */
const FAILURE_KIND_BY_CODE: Partial<Record<string, AssistantRowFailureKind>> = {
  PRODUCT_SOLD_OUT: 'sold-out',
  // The id resolved against the menu when the assistant proposed it and does
  // not now — the usual cause is a proposal answered after the menu changed.
  PRODUCT_NOT_FOUND: 'off-menu',
  // The cart no longer holds that line, which is a different fact from the
  // product leaving the menu — it shared `off-menu` and told the guest their
  // item was off the menu while both the product and the item were still
  // there. The usual cause is the line having merged into an identical one
  // after the guest edited its options, so the item is in the cart under
  // another id; deleting it in another tab reads the same from here.
  CART_ITEM_NOT_FOUND: 'item-gone',
  MODIFIER_SELECTION_INVALID: 'options-changed',
  BAD_REQUEST: 'options-changed',
  NOT_ITEM_OWNER: 'options-changed',
  CART_NOT_ACTIVE: 'cart-closed',
  CART_NOT_FOUND: 'cart-closed',
  ORDER_LOCKED: 'cart-closed',
  ORDER_NOT_FOUND: 'cart-closed',
  ORDER_TYPE_NOT_ENABLED: 'cart-closed',
  STORE_NOT_OPEN: 'cart-closed',
  INVALID_GUEST_TOKEN: 'cart-closed',
  TOO_MANY_REQUESTS: 'temporary',
  INTERNAL_SERVER_ERROR: 'temporary',
  CONFLICT: 'temporary',
};

/**
 * How a proposal in the transcript should be drawn.
 *
 * - `live` — the one the guest is deciding on; the card owns it.
 * - `history` — a proposal that has been decided. Shown as a record, with the
 *   results the server recorded, so scrolling back reads as a conversation.
 *
 * There is no third state. A restored proposal that is still pending comes back
 * as `live`, because the server now records whether a proposal was decided —
 * which is exactly what the panel could not tell before, and why it used to warn
 * a guest to ask again for something already in their cart.
 */
export type AssistantProposalRecord = 'live' | 'history';

/**
 * One choice on a proposed item, in the shape the card's picker takes.
 *
 * The same shape whether the guest is being asked for it or has chosen to
 * change it, which is what lets the card have one picker instead of two.
 */
export type AssistantChoicePickerView = {
  operationId: string;
  /** The item the choice belongs to, so the guest knows what they are answering for. */
  itemSummary: string;
  modifierId: string;
  label: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  /** More than one option may be picked, so a tap toggles and the guest confirms. */
  isMultiSelect: boolean;
  options: { id: string; label: string; priceAdjustment: number }[];
  /**
   * What is selected now: the guest's answer where they gave one, otherwise
   * what the assistant proposed.
   */
  selectedOptionIds: string[];
};

/**
 * A choice that already has an answer, shown on its row as text the guest can
 * tap to change. `selectedLabels` is empty for an optional choice the guest
 * declined, which is an answer and stays changeable like any other.
 */
export type AssistantRowChoiceView = AssistantChoicePickerView & {
  selectedLabels: string[];
};

export type AssistantProposalRowView = {
  operationId: string;
  /**
   * The operation's line. For an item that carries choices it is the line
   * WITHOUT them: `choices` below says what is selected, and it is the one that
   * follows the guest's edits.
   */
  summary: string;
  status: AiOrderingProposalRowStatus;
  /** Present only on a `failed` row, and only once the reason is known. */
  failure?: { kind: AssistantRowFailureKind };
  /** A row can only be dismissed while it is still undecided. */
  canDismiss: boolean;
  /** The answered choices, in the order the guest was or would be asked. */
  choices: AssistantRowChoiceView[];
  /** Choices can only be changed while the row is still undecided. */
  canEditChoices: boolean;
};

/**
 * The choice the guest is being asked for now.
 *
 * Reported one at a time rather than as a list: the guest answers these in the
 * card, and showing every open choice on every row at once is the pile of
 * decisions this is meant to avoid. The order is the backend's — required
 * before optional, grouped by the item they belong to — so finishing one drink
 * comes before starting the next.
 */
export type AssistantOpenChoiceView = AssistantChoicePickerView & {
  /** How many are still waiting, including this one. */
  remainingCount: number;
};

export type AssistantProposalView = {
  proposalId: string;
  rows: AssistantProposalRowView[];
  /**
   * The choice the guest is being asked for now, or null when none is left.
   *
   * An optional choice counts as answered once it has been skipped, so the
   * queue always empties. A choice that already has an answer — the guest's or
   * the assistant's — is never queued; it is on its row, changeable.
   */
  openChoice: AssistantOpenChoiceView | null;
  /**
   * The names of every choice still waiting, in the order they will be asked.
   *
   * The picker asks one at a time, which is right for answering and wrong for
   * knowing how much is left: with one choice open it shows a picker and no
   * count at all, and the guest cannot tell whether the assistant is waiting on
   * them or has simply stopped.
   *
   * Written by the panel from what is open, never by the assistant. Naming the
   * remaining choices is a fact about the controls on screen, so it must be
   * exactly right and cost nothing — and keeping one owner is what stops the
   * guest reading the same thing twice, once as interface and once as a reply.
   */
  openChoiceLabels: string[];
  /**
   * Whether the guest decides. Resolved server-side from the store setting AND
   * the active version's permission — the panel only reports it.
   */
  showsConfirmationControls: boolean;
  /**
   * True while the proposal is still the guest's to decide: not applied, and at
   * least one row not dismissed. Distinct from `canApply`, which also waits on
   * the required choices — a proposal with one of those open is still waiting
   * on the guest, just not on the button yet.
   */
  isAwaitingDecision: boolean;
  /**
   * False once every row is dismissed, once the proposal has been applied, or
   * while a required choice is unanswered.
   */
  canApply: boolean;
  isApplied: boolean;
};

/**
 * The one thing waiting on the guest, held above the composer rather than in
 * the transcript, so it stays on screen however far the conversation scrolls.
 *
 * At most one exists: a proposal still to be decided, or the question the last
 * reply asked. A proposal that has been decided, or that applies without asking,
 * is not waiting on anyone and stays in the transcript.
 */
export type AssistantDockView =
  | { kind: 'proposal'; proposal: AssistantProposalView }
  | {
      kind: 'question';
      promptId: string;
      question: string;
      options: AiOrderingChoiceModel[];
      allowsFreeText: boolean;
    };

export type AssistantPanelView = {
  /** False hides the entry point entirely; the panel is never reachable. */
  isAvailable: boolean;
  entries: AssistantEntryView[];
  proposal: AssistantProposalView | null;
  dock: AssistantDockView | null;
  /** The prompt a typed answer or a picked option should answer, if any. */
  openPrompt: { promptId: string } | null;
  isSending: boolean;
  /**
   * True while an accepted proposal is being applied to the cart.
   *
   * Reported separately from `isSending` because the panel treats them
   * differently: a turn in flight shows a thinking line inside the transcript,
   * while an apply blocks the surface until the cart has settled.
   */
  isApplying: boolean;
  /**
   * True while the stored transcript is being read. Distinct from `isSending`:
   * one is the panel filling itself in, the other is a turn in flight.
   */
  isLoadingTranscript: boolean;
  /**
   * True only once the transcript is known to be empty. The empty-state hint has
   * to wait for that, or it flashes "ask me about a dish" at a guest who is
   * mid-conversation.
   */
  showsEmptyHint: boolean;
  error: string | null;
};

function toEntryView(
  entry: StoreFrontAiOrderingState['entries'][number],
  context: {
    liveProposalId: string | undefined;
    productsById: Map<string, PublicProduct>;
  },
): AssistantEntryView {
  if (entry.role === 'guest') {
    return { id: entry.id, kind: 'guest', text: entry.message };
  }

  const { response } = entry;

  switch (response.type) {
    case 'message':
      return { id: entry.id, kind: 'message', reply: response.reply };

    case 'choices':
      return {
        id: entry.id,
        kind: 'choices',
        reply: response.reply,
        question: response.question,
        inputMode: response.inputMode,
        options: response.options,
        promptId: response.promptId,
        allowsFreeText: response.allowFreeText,
      };

    case 'products':
      return {
        id: entry.id,
        kind: 'products',
        reply: response.reply,
        products: response.productIds.flatMap((productId) => {
          const product = context.productsById.get(productId);

          return product ? [product] : [];
        }),
      };

    case 'proposal':
      return {
        id: entry.id,
        kind: 'proposal',
        reply: response.reply,
        proposalId: response.proposalId,
        operations: response.operations.map((operation) => ({
          operationId: operation.operationId,
          summary:
            entry.proposalResults !== undefined
              ? // Decided, so nothing can change any more and the line names
                // the options: the guest's version where they changed one,
                // otherwise the operation's own, which is then what was applied.
                (entry.proposalAppliedSummaries?.find(
                  (applied) => applied.operationId === operation.operationId,
                )?.summary ?? operation.summary)
              : // Still open: the card lists the choices beside this line and
                // the guest may yet change them, so the line leaves them out
                // rather than naming picks that might not be the final ones.
                rowSummary(operation),
        })),
        record:
          context.liveProposalId === response.proposalId ? 'live' : 'history',
        // Results the server recorded, present on every decided proposal
        // including one restored after a reload.
        ...(entry.proposalResults !== undefined
          ? { results: entry.proposalResults }
          : {}),
        ...(entry.proposalReply !== undefined
          ? { decidedReply: entry.proposalReply }
          : {}),
      };

    case 'unanswered':
      return {
        id: entry.id,
        kind: 'unanswered',
        reply: response.reply,
        reason: response.reason,
      };
  }
}

function rowSummary(operation: AiOrderingOperationModel): string {
  return operation.type === 'remove_own_item'
    ? operation.summary
    : (operation.summaryWithoutChoices ?? operation.summary);
}

/**
 * Adds or removes one option of a multi-select choice.
 *
 * At the maximum a further option is ignored rather than swapped in: which of
 * the picked ones to drop is not something to guess, so the guest unpicks one.
 */
export function toggleChoiceOption(
  choice: { maxSelect: number },
  selectedOptionIds: string[],
  optionId: string,
): string[] {
  if (selectedOptionIds.includes(optionId)) {
    return selectedOptionIds.filter((id) => id !== optionId);
  }

  return selectedOptionIds.length >= choice.maxSelect
    ? selectedOptionIds
    : [...selectedOptionIds, optionId];
}

/** Whether a multi-select choice may be confirmed with what is picked so far. */
export function canConfirmChoice(
  choice: { minSelect: number; maxSelect: number },
  selectedOptionIds: string[],
): boolean {
  return (
    selectedOptionIds.length >= choice.minSelect &&
    selectedOptionIds.length <= choice.maxSelect
  );
}

type RowChoices = {
  /** Already answered, by the guest or by the assistant. */
  answered: AssistantRowChoiceView[];
  /** Still waiting on the guest. */
  open: AssistantChoicePickerView[];
};

/**
 * Splits a row's choices into the ones that have an answer and the ones still
 * waiting for one.
 *
 * "Answered" is decided per choice and by nothing else, so changing one answer
 * cannot send another back to the queue.
 */
function splitRowChoices(
  operation: AiOrderingOperationModel,
  answers: Record<string, string[]>,
): RowChoices {
  const choices: AiOrderingChoiceGroupModel[] =
    operation.type === 'remove_own_item' ? [] : (operation.choices ?? []);
  const split: RowChoices = { answered: [], open: [] };

  for (const choice of choices) {
    const answer = answers[choice.modifierId];
    const selected = answer ?? choice.selectedOptionIds;
    // A required choice is answered when enough is selected, whoever selected
    // it. An optional one is also answered by the guest saying "none", which is
    // why an explicit empty answer counts and an untouched empty one does not.
    const isAnswered = choice.isRequired
      ? selected.length >= choice.minSelect
      : answer !== undefined || selected.length > 0;
    const offered = choice.options.filter((option) =>
      selected.includes(option.optionId),
    );
    const picker: AssistantChoicePickerView = {
      operationId: operation.operationId,
      itemSummary: rowSummary(operation),
      modifierId: choice.modifierId,
      label: choice.label,
      isRequired: choice.isRequired,
      minSelect: choice.minSelect,
      maxSelect: choice.maxSelect,
      isMultiSelect: choice.maxSelect > 1,
      options: choice.options.map((option) => ({
        id: option.optionId,
        label: option.label,
        priceAdjustment: option.priceAdjustment,
      })),
      // Only what can still be picked. A selection that has since sold out is
      // not on the list, and counting it would spend one of the guest's picks
      // on something they cannot see.
      selectedOptionIds: offered.map((option) => option.optionId),
    };

    if (isAnswered) {
      split.answered.push({
        ...picker,
        selectedLabels: offered.map((option) => option.label),
      });
    } else {
      split.open.push(picker);
    }
  }

  return split;
}

function toProposalView(
  proposal: NonNullable<StoreFrontAiOrderingState['proposal']>,
): AssistantProposalView {
  const openChoices: AssistantChoicePickerView[] = [];

  const rows: AssistantProposalRowView[] = proposal.rows.map((row) => {
    const kind =
      row.status === 'failed' && row.failureCode !== undefined
        ? (FAILURE_KIND_BY_CODE[row.failureCode] ?? 'unknown')
        : undefined;
    const choices = splitRowChoices(
      row.operation,
      proposal.choiceAnswers[row.operation.operationId] ?? {},
    );

    // Only rows that are actually being applied are asked about: a dismissed
    // row's choices are not going anywhere, so asking for them would be asking
    // for nothing.
    if (row.status === 'pending') {
      openChoices.push(...choices.open);
    }

    return {
      operationId: row.operation.operationId,
      summary: rowSummary(row.operation),
      status: row.status,
      // Undecided is the only dismissable state. Once the proposal is decided
      // every row has a result, and a decided proposal cannot be answered again.
      canDismiss: row.status === 'pending',
      choices: choices.answered,
      canEditChoices: row.status === 'pending' && !proposal.isApplied,
      ...(kind !== undefined ? { failure: { kind } } : {}),
    };
  });

  const [next] = openChoices;
  const hasUnansweredRequired = openChoices.some((choice) => choice.isRequired);
  // Gated on `isApplied` again, now that it means something it did not before:
  // the proposal has been decided, and a decided proposal cannot be answered a
  // second time. There are no stranded rows to resume, because the server
  // reports a result for every operation including the ones a failure left
  // unattempted.
  const isAwaitingDecision =
    !proposal.isApplied && rows.some((row) => row.status === 'pending');

  return {
    proposalId: proposal.proposalId,
    rows,
    openChoice:
      next && !proposal.isApplied
        ? { ...next, remainingCount: openChoices.length }
        : null,
    openChoiceLabels: proposal.isApplied
      ? []
      : openChoices.map((choice) => choice.label),
    // A required choice still open means the proposal is not applicable at all,
    // whatever the store's confirmation setting says. The server refuses it too,
    // so this is the button agreeing with the guarantee rather than being it.
    showsConfirmationControls:
      proposal.confirmationRequired || hasUnansweredRequired,
    isAwaitingDecision,
    canApply: isAwaitingDecision && !hasUnansweredRequired,
    isApplied: proposal.isApplied,
  };
}

export function buildAssistantPanelView(input: {
  state: StoreFrontAiOrderingState;
  isAvailable: boolean;
  /**
   * The store's menu, when it is loaded. A shown set of products is ids only,
   * and this is what turns them into cards; without it those entries render as
   * their reply alone rather than as an empty shelf.
   */
  menu?: PublicMenu | null;
}): AssistantPanelView {
  const { state } = input;
  const productsById = new Map(
    (input.menu?.groups ?? []).flatMap((group) =>
      group.products.map((product) => [product.id, product] as const),
    ),
  );
  const entries = state.entries.map((entry) =>
    toEntryView(entry, {
      liveProposalId: state.proposal?.proposalId,
      productsById,
    }),
  );

  // Only the LAST answer's prompt is open. An older question the guest scrolled
  // past is not what their next message answers.
  const lastEntry = entries.at(-1);
  const openPrompt =
    lastEntry?.kind === 'choices' ? { promptId: lastEntry.promptId } : null;

  const proposal = state.proposal ? toProposalView(state.proposal) : null;
  const dock: AssistantDockView | null =
    // `isAwaitingDecision`, not `canApply`: a proposal with a required choice
    // still open cannot be applied yet, but it is waiting on the guest all the
    // same, and its picker has to stay where the rest of the card will be.
    proposal?.showsConfirmationControls && proposal.isAwaitingDecision
      ? { kind: 'proposal', proposal }
      : lastEntry?.kind === 'choices'
        ? {
            kind: 'question',
            promptId: lastEntry.promptId,
            question: lastEntry.question,
            options: lastEntry.options,
            allowsFreeText: lastEntry.allowsFreeText,
          }
        : null;

  return {
    isAvailable: input.isAvailable,
    entries,
    proposal,
    dock,
    openPrompt,
    isSending: state.isSending,
    isApplying: state.isApplying,
    isLoadingTranscript: state.isLoading,
    showsEmptyHint: state.isLoaded && entries.length === 0,
    error: state.error,
  };
}
