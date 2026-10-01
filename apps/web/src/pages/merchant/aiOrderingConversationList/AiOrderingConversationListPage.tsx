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
      header: tDefault('merchant.aiOrdering.participant', 'Guest'),
      render: (row) => (
        <span className="font-mono text-xs">{row.participantId}</span>
      ),
    },
    {
      key: 'turnCount',
      header: tDefault('merchant.aiOrdering.turnCount', 'Turns'),
      align: 'right',
      render: (row) => row.turnCount,
    },
    {
      key: 'unansweredCount',
      header: tDefault('merchant.aiOrdering.unansweredCount', 'Unanswered'),
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
      header: tDefault('merchant.aiOrdering.lastTurnAt', 'Last message'),
      render: (row) =>
        row.lastTurnAt ? new Date(row.lastTurnAt).toLocaleString() : '—',
    },
  ];

  if (vm.error) {
    return <ErrorState message={vm.error} onRetry={vm.retry} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {tDefault('merchant.aiOrdering.conversationsTitle', 'Assistant conversations')}
        </h1>
        <Button variant="outline" size="sm" onClick={vm.goToUnanswered}>
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
            'merchant.aiOrdering.conversationsEmpty',
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
    </div>
  );
}
