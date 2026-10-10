import { useAppTranslation } from '@/app/i18n';
import { AiOrderingConversationTurnList } from '@/features/components/aiOrdering/ConversationTurnList';
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
        label={tDefault('common.aiOrdering.loading', 'Loading conversation…')}
      />
    );
  }

  return (
    <section className="admin-page-content">
      <div>
        <Button
          onClick={vm.goBack}
          size="sm"
          type="button"
          variant="ghost"
          className="-ml-2"
        >
          ← {tDefault('common.actions.back', 'Back')}
        </Button>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl leading-tight font-bold md:text-4xl">
            {tDefault('common.aiOrdering.conversationTitle', 'Conversation')}
          </h1>
          {vm.degradedTurnCount > 0 ? (
            <Badge variant="destructive">
              {vm.degradedTurnCount}{' '}
              {tDefault('common.aiOrdering.degradedTurns', 'degraded')}
            </Badge>
          ) : null}
        </div>
        <p className="max-w-2xl text-base text-muted-foreground">
          {tDefault(
            'merchant.aiOrdering.conversationDescription',
            'Every turn of this conversation, and what the model was given.',
          )}
        </p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          {vm.participantId}
        </p>
      </div>

      {vm.summary ? (
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          {vm.summary}
        </p>
      ) : null}

      <AiOrderingConversationTurnList turns={vm.turns} />
    </section>
  );
}
