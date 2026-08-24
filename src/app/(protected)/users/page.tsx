'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useList } from '@refinedev/core';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlanBadge, StatusBadge } from '@/components/users/badges';
import { CreateUserDialog } from '@/components/users/create-user-dialog';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';

type UserRow = {
  id: number;
  name: string;
  isAdmin: boolean;
  currentSubscription: {
    plan: string;
    label: string;
    currentPeriodEnd: string | null;
    // Считаем по currentPeriodEnd относительно текущего момента, а не по
    // полю status в БД — оно ненадёжно (может не совпадать с реальным
    // периодом действия подписки).
    isActive: boolean;
  } | null;
};

const PAGE_SIZE = 20;

export default function UsersListPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { query, result } = useList<UserRow>({
    resource: 'users',
    pagination: { currentPage: page, pageSize: PAGE_SIZE },
    filters: search ? [{ field: 'search', operator: 'eq', value: search }] : [],
  });

  const total = result.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const applySearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const columns: DataTableColumn<UserRow>[] = [
    {
      header: '№',
      headerClassName: 'w-16',
      cellClassName: 'text-muted-foreground',
      render: (_user, index) => (page - 1) * PAGE_SIZE + index + 1,
    },
    {
      header: 'Имя',
      render: (user) => (
        <span className="flex items-center gap-2 font-medium">
          {user.name}
          {user.isAdmin && <Badge variant="secondary">admin</Badge>}
        </span>
      ),
    },
    {
      header: 'План',
      headerClassName: 'w-40',
      render: (user) =>
        user.currentSubscription ? (
          <PlanBadge plan={user.currentSubscription.plan} label={user.currentSubscription.label} />
        ) : (
          '—'
        ),
    },
    {
      header: 'Статус',
      headerClassName: 'w-36',
      render: (user) => (
        <StatusBadge
          status={user.currentSubscription ? (user.currentSubscription.isActive ? 'active' : 'expired') : null}
        />
      ),
    },
    {
      header: 'Действует до',
      headerClassName: 'w-32',
      cellClassName: 'text-muted-foreground',
      render: (user) =>
        user.currentSubscription?.currentPeriodEnd
          ? new Date(user.currentSubscription.currentPeriodEnd).toLocaleDateString('ru-RU')
          : '—',
    },
  ];

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[21px] font-semibold tracking-tight">Пользователи</h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">{total} учётных записей</p>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-70">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            className="pl-8"
          />
        </div>
        <Button variant="secondary" onClick={applySearch} className="shrink-0">
          Найти
        </Button>
        <div className="sm:ml-auto">
          <CreateUserDialog />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={result.data}
        rowKey={(user) => user.id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        onRowNavigate={(user) => router.push(`/users/show/${user.id}`)}
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
