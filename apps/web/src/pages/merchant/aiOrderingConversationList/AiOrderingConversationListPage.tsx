import { useAppTranslation } from '@/app/i18n';
import { DataTable, type DataTableColumn } from '@/shared/components/DataTable';
import { ErrorState } from '@/shared/components/ErrorState';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';

import { useAiOrderingConversationListPageVM } from './useAiOrderingConversationListPageVM';

type ConversationRow =
  ReturnType<typeof useAiOrderingConversationListPageVM>['conversations'][number];

export function AiOrderingConversationListPage() {
  const { tDefault } = useAppTranslation();
  const vm = useAiOrderingConversationListPageVM();

  const columns: DataTableColumn<ConversationRow>[] = [
    {
      key: 'participantId',
      header: tDefault('common.aiOrdering.participant', 'Guest'),
      className: 'pl-4',
      render: (row) => (
        <span className="font-mono text-xs">{row.participantId}</span>
      ),
    },
    {
      key: 'turnCount',
      header: tDefault('common.aiOrdering.turnCount', 'Turns'),
      align: 'right',
      render: (row) => row.turnCount,
    },
    {
      key: 'unansweredCount',
      header: tDefault('common.aiOrdering.unansweredCount', 'Unanswered'),
      align: 'right',
      render: (row) =>
        row.unansweredCount > 0 ? (
          <Badge variant="destructive">{row.unansweredCount}</Badge>
        ) : (
          <span className="text-muted-foreground">0</span>
        ),
    },
    {
      key: 'lastTurnAt',
      header: tDefault('common.aiOrdering.lastTurnAt', 'Last message'),
      render: (row) =>
        row.lastTurnAt ? new Date(row.lastTurnAt).toLocaleString() : '—',
    },
  ];

  if (vm.error) {
    return <ErrorState message={vm.error} onRetry={vm.retry} />;
  }

  return (
    <section className="admin-page-content">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mb-3 text-3xl leading-tight font-bold md:text-4xl">
            {tDefault(
              'merchant.aiOrdering.conversationsTitle',
              'Assistant conversations',
            )}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            {tDefault(
              'merchant.aiOrdering.conversationsDescription',
              'Every conversation your guests had with the ordering assistant.',
            )}
          </p>
        </div>
        <Button variant="outline" onClick={vm.goToUnanswered} type="button">
          {tDefault(
            'merchant.aiOrdering.viewUnanswered',
            'Unanswered questions',
          )}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={vm.conversations}
        isLoading={vm.isLoading}
        labels={{
          empty: tDefault(
            'common.aiOrdering.conversationsEmpty',
            'No assistant conversations yet.',
          ),
        }}
        onRowClick={(row) => {
          vm.openConversation(row.id);
        }}
        pagination={{
          type: 'offset',
          page: vm.page,
          totalPages: vm.totalPages,
          onPageChange: vm.setPage,
        }}
        rowKey={(row) => row.id}
      />
    </section>
  );
}
