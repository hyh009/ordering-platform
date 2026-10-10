import { useAppTranslation } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import { AiOrderingConversationTurnList } from '@/features/components/aiOrdering/ConversationTurnList';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { Badge } from '@/shared/components/ui/badge';

import { useAdminAiOrderingConversationDetailPageVM } from './useAdminAiOrderingConversationDetailPageVM';

export function AdminAiOrderingConversationDetailPage() {
  const { tDefault } = useAppTranslation();
  const vm = useAdminAiOrderingConversationDetailPageVM();

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

  const breadcrumbItems = [
    {
      label: tDefault('admin.organizations.title', 'Organizations'),
      href: PATHS.SUPER_ADMIN.ORGANIZATIONS,
    },
    {
      label: tDefault(
        'admin.aiOrdering.conversationsTitle',
        'Assistant conversations',
      ),
      href: PATHS.SUPER_ADMIN.AI_CONVERSATIONS_BUILD(vm.storeId),
    },
    { label: tDefault('common.aiOrdering.conversationTitle', 'Conversation') },
  ];

  return (
    <section className="admin-page-content">
      <div>
        <Breadcrumb items={breadcrumbItems} />
        <p className="mt-4 mb-2 text-xs font-bold tracking-[0.08em] text-primary uppercase">
          {tDefault('admin.eyebrow', 'Super admin')}
        </p>
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
            'admin.aiOrdering.conversationDescription',
            'Every turn of this conversation, and the prompt it was answered under.',
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

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          {tDefault(
            'admin.aiOrdering.promptSection',
            'The prompt behind these turns',
          )}
        </h2>

        {vm.promptPreludes.length === 0 ? (
          // Said out loud rather than left blank: every turn here predates the
          // prompt being stored, which is not the same as the prompt being empty.
          <p className="text-sm text-muted-foreground">
            {tDefault(
              'admin.aiOrdering.promptMissing',
              'No prompt was stored for these turns. Only turns recorded after prompt storage shipped carry one.',
            )}
          </p>
        ) : null}

        {vm.promptPreludes.map((prelude) => (
          <details
            key={prelude.hash}
            className="rounded-lg border border-border p-3 text-xs"
          >
            <summary className="cursor-pointer text-muted-foreground">
              {tDefault(
                'admin.aiOrdering.promptPrelude',
                'Prompt sent on every turn',
              )}
              <span className="ml-2 font-mono">{prelude.hash}</span>
            </summary>

            <div className="mt-2 space-y-3">
              <div>
                <p className="text-muted-foreground">
                  {tDefault(
                    'admin.aiOrdering.promptCoreInstructions',
                    'Core instructions',
                  )}
                </p>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-muted p-2 font-mono">
                  {prelude.coreInstructions}
                </pre>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {tDefault('admin.aiOrdering.promptTools', 'Tools')}
                </p>
                <pre className="mt-1 max-h-96 overflow-auto rounded bg-muted p-2 font-mono">
                  {prelude.tools}
                </pre>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {tDefault('admin.aiOrdering.promptStoreData', 'Store data')}
                </p>
                <pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 font-mono">
                  {prelude.storeData}
                </pre>
              </div>
            </div>
          </details>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          {tDefault('common.aiOrdering.turnsSection', 'Turns')}
        </h2>
        <AiOrderingConversationTurnList turns={vm.turns} />
      </section>
    </section>
  );
}
