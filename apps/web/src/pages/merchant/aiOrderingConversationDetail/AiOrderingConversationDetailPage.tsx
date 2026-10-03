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
