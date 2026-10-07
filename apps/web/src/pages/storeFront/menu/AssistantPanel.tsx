import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send, ShoppingCart } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Spinner } from '@/shared/components/ui/spinner';

import { AssistantCartPanel } from './AssistantCartPanel';
import { AssistantProposalCard } from './AssistantProposalCard';
import { AssistantProposalRecord } from './AssistantProposalRecord';
import { AssistantProductRow } from './AssistantProductRow';
import { AssistantQuestionCard } from './AssistantQuestionCard';

import type { TagDisplay } from '@/features/storeFront/components/ProductCard';
import type { PublicProduct } from '@/models/storeFrontMenu';
import type { useAssistantPanelVM } from './useAssistantPanelVM';

type AssistantPanelProps = {
  vm: ReturnType<typeof useAssistantPanelVM>;
  /**
   * Opens a shown product in the page's own configuration sheet.
   *
   * Handed down rather than owned here, because the sheet the menu page already
   * opens is the one that validates choices and adds to the cart. The assistant
   * showing a product must reach the same sheet a guest reaches by tapping it on
   * the menu, or there would be two ways to add an item.
   */
  onOpenProduct: (product: PublicProduct) => void;
  /** False while the store is shut, which disables a shown product the way the menu grid does. */
  isStoreOpen: boolean;
  /** The same tags and allergen marks the menu grid gives a product. */
  describeProduct: (product: PublicProduct) => {
    tags: TagDisplay[];
    allergens: string[];
  };
};

/**
 * The chat panel. Every response type is rendered from the shape the VM hands
 * over; the view resolves nothing itself.
 */
export function AssistantPanel({
  vm,
  onOpenProduct,
  isStoreOpen,
  describeProduct,
}: AssistantPanelProps) {
  const { tDefault } = useAppTranslation();
  const transcriptRef = useRef<HTMLDivElement>(null);

  // A pure visibility toggle, so it stays here rather than in the VM, which owns
  // page flow. At `md` and up the cart column is always rendered and this is
  // simply unread, so a stale `true` left by a resize changes nothing.
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Scroll measurement, so it stays in the component rather than the VM. The
  // latest exchange is the only part worth opening on: a returning guest lands
  // mid-conversation otherwise, which is what the panel looked like before.
  // Re-runs on a new entry, on the proposal card appearing or changing height,
  // on the thinking indicator, since each one grows the transcript, and on the
  // dock arriving, which takes its height out of the transcript's.
  useEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript) return;

    transcript.scrollTop = transcript.scrollHeight;
    // Transcript values only. Cart values are deliberately absent: the cart is
    // on screen beside this, and a quantity change there must not yank the
    // transcript to the bottom while the guest is reading further up.
  }, [vm.entries, vm.proposal, vm.dock, vm.isSending]);

  return (
    <div className="fixed inset-x-0 top-0 z-page-modal h-dvh">
      {/* `h-dvh`, never `h-screen`: iOS Safari's `100vh` excludes the address
          bar, which would push the composer under the browser chrome.
          `StoreFrontLayout` already settles this the same way.

          The height is FIXED, not a maximum. A `max-h` box grows with its
          content, and a growing box has to put that growth somewhere — the
          header and the composer were moving on every new message. A fixed
          height lets the transcript flex inside a frame that never shifts. */}
      <div className="relative flex h-full w-full flex-col bg-background">
        {/* Full-bleed background, constrained content. On a wide screen an
            unconstrained conversation runs to an unreadable line length and
            pushes the cart column to the far edge, which undoes the one thing
            this layout is for: reading both at once. */}
        <div className="flex min-h-0 w-full flex-1 flex-col md:mx-auto md:max-w-5xl md:border-x md:border-border">
          <header className="flex items-center justify-between border-b border-border p-4">
            <h2 className="text-base font-semibold">
              {tDefault('guest.assistant.title', 'Ordering assistant')}
            </h2>

            <div className="flex items-center gap-1">
              {/* Below `md` only: at `md` and up the cart is already beside the
                  conversation, so a control to reveal it would do nothing. */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => {
                  setIsCartOpen(true);
                }}
              >
                <ShoppingCart size={16} strokeWidth={2} />
                {tDefault('guest.assistant.viewCart', 'Cart')}
              </Button>
              <Button variant="ghost" size="sm" onClick={vm.close}>
                {tDefault('common.close', 'Close')}
              </Button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
              <div
                ref={transcriptRef}
                className="flex-1 space-y-3 overflow-y-auto p-4"
              >
                {vm.isLoadingTranscript ? (
                  <div
                    className="flex items-center justify-center py-6 text-muted-foreground"
                    role="status"
                    aria-label={tDefault(
                      'guest.assistant.loading',
                      'Loading your conversation…',
                    )}
                  >
                    <Spinner className="size-5" />
                  </div>
                ) : null}

                {vm.showsEmptyHint ? (
                  <p className="text-sm text-muted-foreground">
                    {tDefault(
                      'guest.assistant.emptyHint',
                      'Ask about a dish, or describe what you feel like eating.',
                    )}
                  </p>
                ) : null}

                {vm.entries.map((entry) => {
                  if (entry.kind === 'guest') {
                    return (
                      <p
                        key={entry.id}
                        className="ml-auto max-w-[85%] rounded-xl bg-storefront-primary px-3 py-2 text-sm text-storefront-text"
                      >
                        {entry.text}
                      </p>
                    );
                  }

                  return (
                    <div key={entry.id} className="max-w-[90%] space-y-2">
                      <p className="rounded-xl bg-muted px-3 py-2 text-sm">
                        {entry.reply}
                      </p>

                      {/* Asked and answered: the question stays as text so the
                          exchange still reads back. One still waiting is in the
                          dock below, and is not repeated here. The model often
                          words the reply and the question identically; said
                          once is enough. */}
                      {entry.kind === 'choices' &&
                      !(
                        vm.dock?.kind === 'question' &&
                        vm.dock.promptId === entry.promptId
                      ) &&
                      entry.question.trim() !== entry.reply.trim() ? (
                        <p className="px-3 text-sm text-muted-foreground">
                          {entry.question}
                        </p>
                      ) : null}

                      {entry.kind === 'products' ? (
                        <AssistantProductRow
                          products={entry.products}
                          describeProduct={describeProduct}
                          isStoreOpen={isStoreOpen}
                          onOpenProduct={onOpenProduct}
                        />
                      ) : null}

                      {/* Still to be decided: the dock holds it. Decided, or
                          applied without asking: it is shown here with what
                          became of each row. */}
                      {entry.kind === 'proposal' &&
                      entry.record === 'live' &&
                      vm.proposal &&
                      vm.dock?.kind !== 'proposal' ? (
                        <AssistantProposalCard
                          proposal={vm.proposal}
                          isApplying={vm.isApplying}
                          onDismissOperation={vm.dismissOperation}
                          onAnswerChoice={vm.answerProposalChoice}
                          onApply={() => {
                            void vm.applyProposal();
                          }}
                        />
                      ) : null}

                      {entry.kind === 'proposal' && entry.record !== 'live' ? (
                        <AssistantProposalRecord
                          operations={entry.operations}
                          {...(entry.results !== undefined
                            ? { results: entry.results }
                            : {})}
                        />
                      ) : null}
                    </div>
                  );
                })}

                {vm.isSending ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner className="size-4" />
                    {tDefault('guest.assistant.thinking', 'Thinking…')}
                  </div>
                ) : null}

                {vm.error ? (
                  <p className="text-sm text-destructive">{vm.error}</p>
                ) : null}
              </div>

              {/* Between the transcript and the composer, never over either:
                  the guest can still read the reply above and type instead of
                  tapping. It arrives with a new reply and leaves with the
                  guest's answer — both moments the transcript is already
                  moving — and holds one height in between. */}
              {vm.dock ? (
                <div className="flex max-h-[45%] shrink-0 animate-in flex-col border-t border-border p-4 duration-200 slide-in-from-bottom-4 fade-in">
                  {vm.dock.kind === 'question' ? (
                    <AssistantQuestionCard
                      key={vm.dock.promptId}
                      question={vm.dock.question}
                      options={vm.dock.options}
                      allowsFreeText={vm.dock.allowsFreeText}
                      disabled={vm.isSending}
                      onAnswer={(option) => {
                        void vm.selectOption(option);
                      }}
                    />
                  ) : (
                    <AssistantProposalCard
                      proposal={vm.dock.proposal}
                      isApplying={vm.isApplying}
                      onDismissOperation={vm.dismissOperation}
                      onAnswerChoice={vm.answerProposalChoice}
                      onApply={() => {
                        void vm.applyProposal();
                      }}
                    />
                  )}
                </div>
              ) : null}

              <form
                className="flex items-center gap-2 border-t border-border p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void vm.submitDraft();
                }}
              >
                <Input
                  value={vm.draft}
                  placeholder={tDefault(
                    'guest.assistant.inputPlaceholder',
                    'Ask or order something…',
                  )}
                  onChange={(event) => {
                    vm.setDraft(event.target.value);
                  }}
                />
                <Button
                  type="submit"
                  variant="storefront"
                  size="icon"
                  aria-label={tDefault('guest.assistant.send', 'Send')}
                  disabled={!vm.canSend}
                >
                  <Send size={16} strokeWidth={2} />
                </Button>
              </form>
            </div>
            {/* Always rendered at `md` and up, which is what makes the toggle
                above inert there. */}
            <div className="hidden w-80 shrink-0 flex-col border-l border-border md:flex">
              <AssistantCartPanel
                groups={vm.cartGroups}
                totals={vm.cartTotals}
                isEmpty={vm.isCartEmpty}
                isMutating={vm.isMutatingCart}
                isApplying={vm.isApplying}
                onChangeQuantity={(item, quantity) => {
                  void vm.changeCartItemQuantity(item, quantity);
                }}
                onEdit={(item) => {
                  void vm.startCartItemEdit(item);
                }}
                onRemove={(item) => {
                  void vm.removeCartItem(item);
                }}
                onSubmit={() => {
                  void vm.submitCart();
                }}
              />
            </div>
          </div>
        </div>

        {/* Below `md`, the cart covers the conversation instead of sitting beside
            it, so only one of the two scrolls at a time. Dismissing it changes
            nothing but this component's own state, which is why the transcript
            and any open proposal are still there underneath. */}
        {isCartOpen ? (
          <div className="absolute inset-0 flex flex-col bg-background md:hidden">
            <header className="flex items-center gap-2 border-b border-border p-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsCartOpen(false);
                }}
              >
                <ArrowLeft size={16} strokeWidth={2} />
                {tDefault('guest.assistant.backToChat', 'Back to chat')}
              </Button>
            </header>

            <div className="min-h-0 flex-1">
              <AssistantCartPanel
                groups={vm.cartGroups}
                totals={vm.cartTotals}
                isEmpty={vm.isCartEmpty}
                isMutating={vm.isMutatingCart}
                isApplying={vm.isApplying}
                onChangeQuantity={(item, quantity) => {
                  void vm.changeCartItemQuantity(item, quantity);
                }}
                onEdit={(item) => {
                  void vm.startCartItemEdit(item);
                }}
                onRemove={(item) => {
                  void vm.removeCartItem(item);
                }}
                onSubmit={() => {
                  void vm.submitCart();
                }}
              />
            </div>
          </div>
        ) : null}

        {/* Inside the panel's own relative box rather than a new fixed layer, so
            no z token is needed and the global feedback/toast layers still sit
            above it — a toast from a failed cart call has to be readable. */}
        {vm.isApplying ? (
          <div
            className="absolute inset-0 flex items-center justify-center bg-background/80"
            role="status"
            aria-label={tDefault(
              'guest.assistant.applying',
              'Updating your cart…',
            )}
          >
            <Spinner className="size-6" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
