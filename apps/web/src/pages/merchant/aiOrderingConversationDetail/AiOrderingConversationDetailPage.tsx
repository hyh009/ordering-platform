import { ArrowLeft } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';

import { useAiOrderingConversationDetailPageVM } from './useAiOrderingConversationDetailPageVM';

export function AiOrderingConversationDetailPage() {
  const { tDefault } = useAppTranslation();
  const vm = useAiOrderingConversationDetailPageVM();

  if (vm.error) {
    return <ErrorState message={vm.error} onRetry={vm.retry} />;
  }

  if (vm.isLoading && vm.turns.length === 0) {
    return (
      <LoadingState
        label={tDefault('merchant.aiOrdering.loading', 'Loading conversation…')}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={vm.goBack}>
          <ArrowLeft size={16} strokeWidth={2} />
        </Button>
        <h1 className="text-xl font-semibold">
          {tDefault('merchant.aiOrdering.conversationTitle', 'Conversation')}
        </h1>
        {vm.degradedTurnCount > 0 ? (
          <Badge variant="destructive">
            {vm.degradedTurnCount}{' '}
            {tDefault('merchant.aiOrdering.degradedTurns', 'degraded')}
          </Badge>
        ) : null}
      </div>

      {vm.summary ? (
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          {vm.summary}
        </p>
      ) : null}

      {vm.promptPreludes.map((prelude) => (
        <details
          key={prelude.hash}
          className="rounded-lg border border-border p-3 text-xs"
        >
          <summary className="cursor-pointer text-muted-foreground">
            {tDefault(
              'merchant.aiOrdering.promptPrelude',
              'Prompt sent on every turn',
            )}
            <span className="ml-2 font-mono">{prelude.hash}</span>
          </summary>

          <div className="mt-2 space-y-3">
            <div>
              <p className="text-muted-foreground">
                {tDefault(
                  'merchant.aiOrdering.promptCoreInstructions',
                  'Core instructions',
                )}
              </p>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-muted p-2 font-mono">
                {prelude.coreInstructions}
              </pre>
            </div>
            <div>
              <p className="text-muted-foreground">
                {tDefault('merchant.aiOrdering.promptTools', 'Tools')}
              </p>
              <pre className="mt-1 max-h-96 overflow-auto rounded bg-muted p-2 font-mono">
                {prelude.tools}
              </pre>
            </div>
            <div>
              <p className="text-muted-foreground">
                {tDefault('merchant.aiOrdering.promptStoreData', 'Store data')}
              </p>
              <pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 font-mono">
                {prelude.storeData}
              </pre>
            </div>
          </div>
        </details>
      ))}

      <ol className="space-y-3">
        {vm.turns.map((turn) => (
          <li key={turn.id} className="rounded-lg border border-border p-3">
            <p className="text-sm font-medium">{turn.message}</p>
            <p className="mt-1 text-sm text-muted-foreground">{turn.reply}</p>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary">{turn.responseType}</Badge>
              <span className="font-mono text-muted-foreground">
                {turn.versionId} · {turn.versionFingerprint}
              </span>
              <span className="text-muted-foreground">
                {turn.provider}/{turn.modelName}
              </span>

              {turn.repairAttempted ? (
                <Badge variant="outline">
                  {turn.repairSucceeded === false
                    ? tDefault(
                        'merchant.aiOrdering.repairFailed',
                        'repair failed',
                      )
                    : tDefault('merchant.aiOrdering.repaired', 'repaired')}
                </Badge>
              ) : null}

              {turn.droppedOperationCount > 0 ? (
                <Badge variant="outline">
                  {tDefault('merchant.aiOrdering.dropped', 'dropped')}:{' '}
                  {turn.droppedOperationCount}
                </Badge>
              ) : null}

              {turn.ownershipViolationCount > 0 ? (
                <Badge variant="outline">
                  {tDefault(
                    'merchant.aiOrdering.ownershipViolations',
                    'ownership',
                  )}
                  : {turn.ownershipViolationCount}
                </Badge>
              ) : null}

              {turn.modelOutput?.toolNames.map((name) => (
                <Badge key={name} variant="secondary" className="font-mono">
                  {name}
                </Badge>
              ))}

              <span className="ml-auto text-muted-foreground">
                {new Date(turn.createdAt).toLocaleString()}
              </span>
            </div>

            {turn.modelOutput ? (
              // Collapsed by default: the reply is what a merchant reads, and
              // the model's own arguments are what they open when the reply and
              // the cart disagree.
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  {tDefault('merchant.aiOrdering.modelOutput', 'Model output')}
                </summary>

                <div className="mt-2 space-y-2">
                  {turn.modelOutput.toolArgs.map((call, index) => (
                    <div key={`${call.name}-${index}`}>
                      <p className="font-mono text-muted-foreground">
                        {call.name}
                      </p>
                      <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 font-mono">
                        {call.json}
                      </pre>
                    </div>
                  ))}

                  {turn.modelOutput.text ? (
                    <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-muted p-2">
                      {turn.modelOutput.text}
                    </pre>
                  ) : null}

                  {turn.modelOutput.toolArgs.length === 0 &&
                  !turn.modelOutput.text ? (
                    <p className="text-muted-foreground">
                      {tDefault(
                        'merchant.aiOrdering.modelOutputEmpty',
                        'The model answered with nothing at all.',
                      )}
                    </p>
                  ) : null}
                </div>
              </details>
            ) : null}

            {turn.modelTrace ? (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  {tDefault(
                    'merchant.aiOrdering.modelTrace',
                    'What the model was given, and each call',
                  )}
                </summary>

                <div className="mt-2 space-y-3">
                  {turn.modelTrace.preludeHash ? (
                    <p className="text-muted-foreground">
                      {tDefault(
                        'merchant.aiOrdering.modelTracePrelude',
                        'Opens with prompt',
                      )}
                      <span className="ml-2 font-mono">
                        {turn.modelTrace.preludeHash}
                      </span>
                    </p>
                  ) : null}

                  {turn.modelTrace.history ? (
                    <div>
                      <p className="text-muted-foreground">
                        {tDefault(
                          'merchant.aiOrdering.modelTraceHistory',
                          'Conversation so far, as sent to the model',
                        )}
                      </p>
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-muted p-2 font-mono">
                        {turn.modelTrace.history}
                      </pre>
                    </div>
                  ) : null}

                  <div>
                    <p className="text-muted-foreground">
                      {tDefault(
                        'merchant.aiOrdering.modelTraceCurrentTurn',
                        'This turn, as sent to the model',
                      )}
                    </p>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-muted p-2 font-mono">
                      {turn.modelTrace.currentTurn}
                    </pre>
                  </div>

                  {turn.modelTrace.calls.map((call, callIndex) => (
                    <div key={callIndex} className="space-y-1">
                      <p className="text-muted-foreground">
                        {tDefault(
                          'merchant.aiOrdering.modelTraceCall',
                          'Call {{number}}',
                          { number: callIndex + 1 },
                        )}
                        <span className="ml-2 font-mono">
                          {call.toolNames.join(', ')}
                        </span>
                      </p>

                      {call.feedback ? (
                        <div>
                          <p className="text-muted-foreground">
                            {tDefault(
                              'merchant.aiOrdering.modelTraceFeedback',
                              'Told about the previous call',
                            )}
                          </p>
                          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded border border-dashed p-2">
                            {call.feedback}
                          </pre>
                        </div>
                      ) : null}

                      {call.toolArgs.map((toolCall, index) => (
                        <div key={`${toolCall.name}-${index}`}>
                          <p className="font-mono text-muted-foreground">
                            {toolCall.name}
                          </p>
                          <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 font-mono">
                            {toolCall.json}
                          </pre>
                        </div>
                      ))}

                      {call.text ? (
                        <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-muted p-2">
                          {call.text}
                        </pre>
                      ) : null}

                      {call.error ? (
                        <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-muted p-2 text-destructive">
                          {call.error}
                        </pre>
                      ) : null}
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </li>
        ))}
      </ol>

      {vm.turns.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {tDefault(
            'merchant.aiOrdering.conversationEmpty',
            'This conversation has no turns.',
          )}
        </p>
      ) : null}
    </div>
  );
}
