import { useEffect, useRef } from 'react';
import { Send } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Spinner } from '@/shared/components/ui/spinner';

import { AssistantProposalCard } from './AssistantProposalCard';

import type { useAssistantPanelVM } from './useAssistantPanelVM';

type AssistantPanelProps = {
  vm: ReturnType<typeof useAssistantPanelVM>;
};

/**
 * The chat panel. Every response type is rendered from the shape the VM hands
 * over; the view resolves nothing itself.
 */
export function AssistantPanel({ vm }: AssistantPanelProps) {
  const { tDefault } = useAppTranslation();
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Scroll measurement, so it stays in the component rather than the VM. The
  // latest exchange is the only part worth opening on: a returning guest lands
  // mid-conversation otherwise, which is what the panel looked like before.
  // Re-runs on a new entry, on the proposal card appearing or changing height,
  // and on the thinking indicator, since each one grows the transcript.
  useEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript) return;

    transcript.scrollTop = transcript.scrollHeight;
  }, [vm.entries, vm.proposal, vm.isSending]);

  return (
    <div className="fixed inset-0 z-page-modal flex flex-col justify-end lg:items-center lg:justify-center">
      <button
        type="button"
        aria-label={tDefault('common.close', 'Close')}
        className="absolute inset-0 bg-black/40"
        onClick={vm.close}
      />

      <div className="relative flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-background lg:mx-auto lg:max-w-lg lg:rounded-2xl lg:shadow-xl">
        <header className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-base font-semibold">
            {tDefault('guest.assistant.title', 'Ordering assistant')}
          </h2>
          <Button variant="ghost" size="sm" onClick={vm.close}>
            {tDefault('common.close', 'Close')}
          </Button>
        </header>

        <div
          ref={transcriptRef}
          className="flex-1 space-y-3 overflow-y-auto p-4"
        >
          {vm.entries.length === 0 ? (
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

                {entry.kind === 'choices' ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{entry.question}</p>
                    <div className="flex flex-wrap gap-2">
                      {entry.options.map((option) => (
                        <Button
                          key={option.id}
                          variant="outline"
                          size="sm"
                          disabled={vm.isSending}
                          onClick={() => {
                            void vm.selectOption(option);
                          }}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                    {entry.allowsFreeText ? (
                      <p className="text-xs text-muted-foreground">
                        {tDefault(
                          'guest.assistant.freeTextHint',
                          'Or just type what you want instead.',
                        )}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {entry.kind === 'proposal' &&
                vm.proposal?.proposalId === entry.proposalId ? (
                  <AssistantProposalCard
                    proposal={vm.proposal}
                    isApplying={vm.isSending}
                    onDismissOperation={vm.dismissOperation}
                    onApply={() => {
                      void vm.applyProposal();
                    }}
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
    </div>
  );
}
