import { useAppTranslation } from '@/app/i18n';
import {
  getOrderPaymentStatusLabel,
  getOrderStatusLabel,
  orderPaymentStatuses,
  orderStatuses,
} from '@/models/order';
import type {
  OrderPaymentStatus,
  OrderStatus,
  OrderSummary,
} from '@/models/order';
import { DataTable, type DataTableColumn } from '@/shared/components/DataTable';
import { FilterSelect } from '@/shared/components/form/FilterSelect';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { formatPrice } from '@/shared/utils/money';
import { useOrderListPageVM } from './useOrderListPageVM';

export function OrderListPage() {
  const { tDefault } = useAppTranslation();
  const vm = useOrderListPageVM();

  const statusOptions: { label: string; value: OrderStatus | '' }[] = [
    {
      label: tDefault('merchant.orders.allStatuses', 'All statuses'),
      value: '',
    },
    ...orderStatuses.map((s) => ({
      label: getOrderStatusLabel(s, tDefault),
      value: s,
    })),
  ];

  const paymentStatusOptions: {
    label: string;
    value: OrderPaymentStatus | '';
  }[] = [
    {
      label: tDefault(
        'merchant.orders.allPaymentStatuses',
        'All payment statuses',
      ),
      value: '',
    },
    ...orderPaymentStatuses.map((s) => ({
      label: getOrderPaymentStatusLabel(s, tDefault),
      value: s,
    })),
  ];

  const columns: DataTableColumn<OrderSummary>[] = [
    {
      key: 'displayNumber',
      header: tDefault('merchant.orders.number', 'Order #'),
      className: 'pl-4',
      render: (order) => (
        <span className="font-semibold">#{order.displayNumber}</span>
      ),
    },
    {
      key: 'status',
      header: tDefault('merchant.orders.status', 'Status'),
      render: (order) => (
        <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
          {getOrderStatusLabel(order.status, tDefault)}
        </span>
      ),
    },
    {
      key: 'paymentStatus',
      header: tDefault('merchant.orders.paymentStatus', 'Payment'),
      cellClassName: 'text-sm text-muted-foreground',
      render: (order) =>
        getOrderPaymentStatusLabel(order.paymentStatus, tDefault),
    },
    {
      key: 'type',
      header: tDefault('merchant.orders.type', 'Type / Table'),
      cellClassName: 'text-sm text-muted-foreground',
      render: (order) => {
        const type =
          order.orderType === 'dine_in'
            ? tDefault('merchant.orders.dineIn', 'Dine in')
            : tDefault('merchant.orders.takeaway', 'Takeaway');
        return order.tableNumber ? `${type} · ${order.tableNumber}` : type;
      },
    },
    {
      key: 'itemCount',
      header: tDefault('merchant.orders.items', 'Items'),
      cellClassName: 'text-sm text-muted-foreground',
      render: (order) => String(order.itemCount),
    },
    {
      key: 'totalAmount',
      header: tDefault('merchant.orders.total', 'Total'),
      cellClassName: 'text-sm',
      render: (order) => formatPrice(order.totalAmount),
    },
    {
      key: 'businessDate',
      header: tDefault('merchant.orders.businessDate', 'Date'),
      cellClassName: 'text-sm text-muted-foreground',
      render: (order) => order.businessDate,
    },
    {
      key: 'actions',
      header: tDefault('common.table.actions', 'Actions'),
      align: 'right',
      className: 'pr-4',
      render: (order) => (
        <Button
          onClick={() => vm.openOrder(order)}
          size="sm"
          type="button"
          variant="secondary"
        >
          {tDefault('common.actions.view', 'View')}
        </Button>
      ),
    },
  ];

  if (vm.isLoading && vm.orders.length === 0) {
    return (
      <LoadingState
        label={tDefault('merchant.orders.loading', 'Loading orders')}
      />
    );
  }

  return (
    <section className="admin-page-content">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mb-3 text-3xl leading-tight font-bold md:text-4xl">
            {tDefault('merchant.orders.title', 'Orders')}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            {tDefault(
              'merchant.orders.description',
              'View and manage store orders.',
            )}
          </p>
        </div>
      </div>

      {vm.error && vm.orders.length === 0 ? (
        <ErrorState message={vm.error} onRetry={vm.retry} />
      ) : (
        <DataTable
          columns={columns}
          data={vm.orders}
          isLoading={vm.isLoading}
          labels={{
            empty: tDefault('merchant.orders.empty', 'No orders found.'),
          }}
          pagination={{
            type: 'offset',
            page: vm.page,
            totalPages: vm.totalPages,
            onPageChange: vm.setPage,
          }}
          rowKey={(order) => order.id}
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="h-8 w-40"
                onChange={(e) => vm.setQFilter(e.target.value)}
                placeholder={tDefault(
                  'merchant.orders.searchPlaceholder',
                  'Search…',
                )}
                type="search"
                value={vm.qFilter}
              />
              <FilterSelect
                onChange={vm.setStatusFilter}
                options={statusOptions}
                value={vm.statusFilter}
              />
              <FilterSelect
                onChange={vm.setPaymentStatusFilter}
                options={paymentStatusOptions}
                value={vm.paymentStatusFilter}
              />
              <Input
                className="h-8 w-36"
                onChange={(e) => vm.setBusinessDateFilter(e.target.value)}
                type="date"
                value={vm.businessDateFilter}
              />
            </div>
          }
        />
      )}
    </section>
  );
}
