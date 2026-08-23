'use client';

import { useCustom } from '@refinedev/core';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiGroupCard } from '@/components/dashboard/kpi-group-card';
import { PlanBreakdownCard } from '@/components/dashboard/plan-breakdown-card';
import { RecentEventsCard } from '@/components/dashboard/recent-events-card';
import { StuckPaymentsCard } from '@/components/dashboard/stuck-payments-card';
import { ExpiringSoonCard } from '@/components/dashboard/expiring-soon-card';
import { formatCurrency, trend } from '@/lib/format';

type Metric = { value: number; previousValue: number };
// Накопительный итог — без previousValue/тренда на дашборде (см. KpiGroupCard).
type CumulativeMetric = { value: number };

type DashboardData = {
  users: {
    total: CumulativeMetric;
    active: Metric;
    newThisMonth: Metric;
    renewedThisMonth: Metric;
  };
  money: {
    totalRevenue: CumulativeMetric;
    revenueThisMonth: Metric;
    recurringRevenue: Metric;
    averageCheck: Metric;
  };
  planBreakdown: { plan: string; label: string; count: number }[];
  stuckPayments: {
    total: number;
    items: {
      id: number;
      ownerId: number;
      ownerName: string | null;
      label: string;
      amount: string;
      currency: string;
      createdAt: string;
    }[];
  };
  expiringSoon: {
    id: number;
    userId: number;
    ownerName: string | null;
    label: string;
    currentPeriodEnd: string;
  }[];
  feed: { text: string; at: string }[];
};

export default function DashboardPage() {
  const { query, result: response } = useCustom<DashboardData>({ url: '/admin/dashboard', method: 'get' });
  const result = response?.data;

  if (query.isLoading) {
    return (
      <div className="space-y-3.5">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!result) {
    return <p className="text-muted-foreground">Не удалось загрузить показатели.</p>;
  }

  const previousValueOf = (metric: Metric, format: (n: number) => string = String) => ({
    previousValue: format(metric.previousValue),
  });

  const activeUsersTrend = trend(result.users.active.value, result.users.active.previousValue);
  const newUsersTrend = trend(result.users.newThisMonth.value, result.users.newThisMonth.previousValue);
  const renewedTrend = trend(result.users.renewedThisMonth.value, result.users.renewedThisMonth.previousValue);
  const revenueThisMonthTrend = trend(
    result.money.revenueThisMonth.value,
    result.money.revenueThisMonth.previousValue,
  );
  const recurringRevenueTrend = trend(
    result.money.recurringRevenue.value,
    result.money.recurringRevenue.previousValue,
  );
  const averageCheckTrend = trend(result.money.averageCheck.value, result.money.averageCheck.previousValue);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[21px] font-semibold tracking-tight">Главная</h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Обзор ключевых показателей SellerIQ
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 items-start gap-3.5 sm:grid-cols-2">
        <KpiGroupCard
          title="Пользователи"
          items={[
            {
              label: 'Всего пользователей',
              value: String(result.users.total.value),
            },
            {
              label: 'Активные пользователи',
              value: String(result.users.active.value),
              trend: activeUsersTrend.label,
              direction: activeUsersTrend.direction,
              ...previousValueOf(result.users.active),
            },
            {
              label: 'Новые за месяц',
              value: String(result.users.newThisMonth.value),
              trend: newUsersTrend.label,
              direction: newUsersTrend.direction,
              ...previousValueOf(result.users.newThisMonth),
            },
            {
              label: 'Продлили подписку за месяц',
              value: String(result.users.renewedThisMonth.value),
              trend: renewedTrend.label,
              direction: renewedTrend.direction,
              ...previousValueOf(result.users.renewedThisMonth),
            },
          ]}
        />
        <KpiGroupCard
          title="Деньги"
          items={[
            {
              label: 'Заработано за весь период',
              value: formatCurrency(result.money.totalRevenue.value),
            },
            {
              label: 'Заработано за этот месяц',
              value: formatCurrency(result.money.revenueThisMonth.value),
              trend: revenueThisMonthTrend.label,
              direction: revenueThisMonthTrend.direction,
              ...previousValueOf(result.money.revenueThisMonth, formatCurrency),
            },
            {
              label: 'Регулярный доход',
              value: formatCurrency(result.money.recurringRevenue.value),
              trend: recurringRevenueTrend.label,
              direction: recurringRevenueTrend.direction,
              ...previousValueOf(result.money.recurringRevenue, formatCurrency),
            },
            {
              label: 'Средний чек',
              value: formatCurrency(result.money.averageCheck.value),
              trend: averageCheckTrend.label,
              direction: averageCheckTrend.direction,
              ...previousValueOf(result.money.averageCheck, formatCurrency),
            },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[1.7fr_1fr]">
        <div className="flex flex-col gap-3.5">
          <PlanBreakdownCard items={result.planBreakdown} />
          <RecentEventsCard events={result.feed} />
        </div>
        <div className="flex flex-col gap-3.5">
          <StuckPaymentsCard total={result.stuckPayments.total} items={result.stuckPayments.items} />
          <ExpiringSoonCard items={result.expiringSoon} />
        </div>
      </div>
    </div>
  );
}
