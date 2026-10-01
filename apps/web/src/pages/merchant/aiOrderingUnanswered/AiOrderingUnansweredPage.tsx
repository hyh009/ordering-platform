import { useAppTranslation } from '@/app/i18n';
import { DataTable, type DataTableColumn } from '@/shared/components/DataTable';
import { ErrorState } from '@/shared/components/ErrorState';
import { FilterSelect } from '@/shared/components/form/FilterSelect';
import { Badge } from '@/shared/components/ui/badge';

import { useAiOrderingUnansweredPageVM } from './useAiOrderingUnansweredPageVM';

import type { AiOrderingUnansweredRow } from './useAiOrderingUnansweredPageVM';
import type { AiOrderingUnansweredReason } from '@/models/aiOrdering';

const REASON_LABELS: Record<
  AiOrderingUnansweredReason,
  { key: string; fallback: string }
> = {
  missing_product_info: {
    key: 'merchant.aiOrdering.reason.missingProductInfo',
    fallback: 'Product information missing',
  },
  out_of_scope: {
    key: 'merchant.aiOrdering.reason.outOfScope',
    fallback: 'Out of scope',
  },
  unclear_request: {
    key: 'merchant.aiOrdering.reason.unclearRequest',
    fallback: 'Unclear request',
  },
};

export function AiOrderingUnansweredPage() {
  const { tDefault } = useAppTranslation();
  const vm = useAiOrderingUnansweredPageVM();

  const columns: DataTableColumn<AiOrderingUnansweredRow>[] = [
    {
      key: 'message',
      header: tDefault('merchant.aiOrdering.question', 'Question'),
      render: (row) => <span className="text-sm">{row.message}</span>,
    },
    {
      key: 'reason',
      header: tDefault('merchant.aiOrdering.reasonColumn', 'Reason'),
      render: (row) => (
        <Badge variant={row.isActionable ? 'destructive' : 'secondary'}>
          {tDefault(
            REASON_LABELS[row.reason].key,
            REASON_LABELS[row.reason].fallback,
          )}
        </Badge>
      ),
    },
    {
      key: 'productId',
      header: tDefault('merchant.aiOrdering.product', 'Product'),
      render: (row) =>
        row.productId ? (
          <span className="font-mono text-xs">{row.productId}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'createdAt',
      header: tDefault('merchant.aiOrdering.askedAt', 'Asked'),
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
  ];

  const reasonOptions: {
    label: string;
    value: AiOrderingUnansweredReason | '';
  }[] = [
    {
      label: tDefault('merchant.aiOrdering.allReasons', 'All reasons'),
      value: '',
    },
    ...vm.reasons.map((reason) => ({
      label: tDefault(REASON_LABELS[reason].key, REASON_LABELS[reason].fallback),
      value: reason,
    })),
  ];

  if (vm.error) {
    return <ErrorState message={vm.error} onRetry={vm.retry} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">
          {tDefault(
            'merchant.aiOrdering.unansweredTitle',
            'Questions the assistant could not answer',
          )}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tDefault(
            'merchant.aiOrdering.unansweredHint',
            'Entries naming a product point at a description worth improving.',
          )}{' '}
          <strong>{vm.actionableCount}</strong>{' '}
          {tDefault('merchant.aiOrdering.actionableOnPage', 'on this page.')}
        </p>
      </div>

      <DataTable
        columns={columns}
        data={vm.rows}
        isLoading={vm.isLoading}
        labels={{
          empty: tDefault(
            'merchant.aiOrdering.unansweredEmpty',
            'The assistant answered everything it was asked.',
          ),
        }}
        pagination={{
          type: 'offset',
          page: vm.page,
          totalPages: vm.totalPages,
          onPageChange: vm.setPage,
        }}
        rowKey={(row) => row.id}
        toolbar={
          <FilterSelect
            options={reasonOptions}
            value={vm.reason}
            onChange={(next) => {
              vm.setReason(next as AiOrderingUnansweredReason | '');
            }}
          />
        }
      />
    </div>
  );
}
