import { useAppTranslation } from '@/app/i18n';
import { Badge } from '@/shared/components/ui/badge';

import type { AiOrderingReviewTurnRow } from './conversationTurnRow';

/**
 * The stored turns of one conversation, as both review surfaces show them.
 *
 * It renders a turn and nothing around it: no page title, no prompt, no
 * navigation. What may be shown beside the turns is the difference between the
 * merchant's page and the platform's, and that decision stays with the page.
 */
export function AiOrderingConversationTurnList({
  turns,
}: {
  turns: AiOrderingReviewTurnRow[];
}) {
  const { tDefault } = useAppTranslation();

  if (turns.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {tDefault(
          'common.aiOrdering.conversationEmpty',
          'This conversation has no turns.',
        )}
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {turns.map((turn) => (
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
                  ? tDefault('common.aiOrdering.repairFailed', 'repair failed')
                  : tDefault('common.aiOrdering.repaired', 'repaired')}
              </Badge>
            ) : null}

            {turn.droppedOperationCount > 0 ? (
              <Badge variant="outline">
                {tDefault('common.aiOrdering.dropped', 'dropped')}:{' '}
                {turn.droppedOperationCount}
              </Badge>
            ) : null}

            {turn.ownershipViolationCount > 0 ? (
              <Badge variant="outline">
                {tDefault('common.aiOrdering.ownershipViolations', 'ownership')}
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
            // Collapsed by default: the reply is what a reviewer reads, and the
            // model's own arguments are what they open when the reply and the
            // cart disagree.
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                {tDefault('common.aiOrdering.modelOutput', 'Model output')}
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
                      'common.aiOrdering.modelOutputEmpty',
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
                  'common.aiOrdering.modelTrace',
                  'What the model was given, and each call',
                )}
              </summary>

              <div className="mt-2 space-y-3">
                {turn.modelTrace.preludeHash ? (
                  <p className="text-muted-foreground">
                    {tDefault(
                      'common.aiOrdering.modelTracePrelude',
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
                        'common.aiOrdering.modelTraceHistory',
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
                      'common.aiOrdering.modelTraceCurrentTurn',
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
                        'common.aiOrdering.modelTraceCall',
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
                            'common.aiOrdering.modelTraceFeedback',
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
  );
}
