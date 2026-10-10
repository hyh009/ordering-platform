import { useAppTranslation } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { DataTable, type DataTableColumn } from '@/shared/components/DataTable';
import { ErrorState } from '@/shared/components/ErrorState';
import { Badge } from '@/shared/components/ui/badge';

import { useAdminAiOrderingConversationListPageVM } from './useAdminAiOrderingConversationListPageVM';

type ConversationRow = ReturnType<
  typeof useAdminAiOrderingConversationListPageVM
>['conversations'][number];

export function AdminAiOrderingConversationListPage() {
  const { tDefault } = useAppTranslation();
  const vm = useAdminAiOrderingConversationListPageVM();

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
    },
  ];

  return (
    <section className="admin-page-content">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Breadcrumb items={breadcrumbItems} />
          <p className="mt-4 mb-2 text-xs font-bold tracking-[0.08em] text-primary uppercase">
            {tDefault('admin.eyebrow', 'Super admin')}
          </p>
          <h1 className="mb-3 text-3xl leading-tight font-bold md:text-4xl">
            {tDefault(
              'admin.aiOrdering.conversationsTitle',
              'Assistant conversations',
            )}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            {tDefault(
              'admin.aiOrdering.conversationsDescription',
              'Every conversation this store’s guests had with the assistant, with the prompt behind each one.',
            )}
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {vm.storeId}
          </p>
        </div>
      </div>

      {vm.error && vm.conversations.length === 0 ? (
        <ErrorState message={vm.error} onRetry={vm.retry} />
      ) : (
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
      )}
    </section>
  );
}
