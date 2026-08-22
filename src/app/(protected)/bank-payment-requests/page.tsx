'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useList } from '@refinedev/core';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { PlanBadge, StatusBadge } from '@/components/users/badges';

type PaymentRow = {
  id: number;
  ownerId: number;
  ownerName: string | null;
  planKey: string;
  label: string;
  addonKeys: string[];
  amount: string;
  currency: string;
  status: 'pending' | 'processing' | 'paid' | 'expired';
  matchedTransactionRef: string | null;
  createdAt: string;
  expiresAt: string;
};

const STUCK_AFTER_HOURS = 6;

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('ru-RU') : '—';
}

function isStuck(payment: PaymentRow) {
  if (payment.status !== 'pending' && payment.status !== 'processing') return false;
  const ageHours = (Date.now() - new Date(payment.createdAt).getTime()) / 36e5;
  return ageHours > STUCK_AFTER_HOURS;
}

const PAGE_SIZE = 20;

export default function BankPaymentRequestsPage() {
  const router = useRouter();
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const { query, result } = useList<PaymentRow>({
    resource: 'bank-payment-requests',
    pagination: { currentPage: page, pageSize: PAGE_SIZE },
    filters: status === 'all' ? [] : [{ field: 'status', operator: 'eq', value: status }],
  });

  const total = result.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const onStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const columns: DataTableColumn<PaymentRow>[] = [
    {
      header: '№',
      headerClassName: 'w-16',
      cellClassName: 'text-muted-foreground',
      render: (_payment, index) => (page - 1) * PAGE_SIZE + index + 1,
    },
    {
      header: 'Владелец',
      render: (payment) => (
        <span className="font-medium">{payment.ownerName ?? `#${payment.ownerId}`}</span>
      ),
    },
    { header: 'План', render: (payment) => <PlanBadge plan={payment.planKey} label={payment.label} /> },
    { header: 'Аддоны', render: (payment) => payment.addonKeys.join(', ') || '—' },
    {
      header: 'Сумма',
      render: (payment) => `${payment.amount} ${payment.currency}`,
    },
    { header: 'Статус', render: (payment) => <StatusBadge status={payment.status} /> },
    {
      header: 'Создана',
      cellClassName: 'text-muted-foreground',
      render: (payment) => formatDate(payment.createdAt),
    },
    {
      header: 'Истекает',
      cellClassName: 'text-muted-foreground',
      render: (payment) => formatDate(payment.expiresAt),
    },
    {
      header: 'Транзакция',
      cellClassName: 'font-mono text-xs text-muted-foreground',
      render: (payment) => payment.matchedTransactionRef ?? '—',
    },
  ];

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[21px] font-semibold tracking-tight">Платежи</h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Заявки на ручную банковскую оплату
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="pending">pending</SelectItem>
            <SelectItem value="processing">processing</SelectItem>
            <SelectItem value="paid">paid</SelectItem>
            <SelectItem value="expired">expired</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <span className="size-2.5 rounded-sm border border-border bg-amber-row" />
          ожидает дольше {STUCK_AFTER_HOURS} часов
        </div>
      </div>

      <DataTable
        columns={columns}
        data={result.data}
        rowKey={(payment) => payment.id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        rowClassName={(payment) => cn(isStuck(payment) && 'bg-amber-row')}
        onRowNavigate={(payment) => router.push(`/users/show/${payment.ownerId}`)}
        pagination={{
          page,
          pageCount,
          onPrev: () => setPage((p) => Math.max(1, p - 1)),
          onNext: () => setPage((p) => Math.min(pageCount, p + 1)),
        }}
      />
    </div>
  );
}
