'use client';

import { useCustom } from '@refinedev/core';
import { Skeleton } from '@/components/ui/skeleton';
import { DynamicsChartCard, type DynamicsPoint } from '@/components/dashboard/dynamics-chart-card';
// TODO(план-разбивка): временно отключено по просьбе — думаем, как лучше
// показать разбивку по тарифам (список тарифов "гуляет" из-за переименований
// в прошлом), вернуться к этому. См. PlanBreakdownTrendCard и
// planBreakdownSeriesByMonth/getAnalytics.js на бэке — там уже есть фильтр
// "только тарифы с подписчиками в текущем месяце", возможно этого хватит.
// import { PlanBreakdownTrendCard, type PlanBreakdownPoint } from '@/components/dashboard/plan-breakdown-trend-card';
import { formatCurrency } from '@/lib/format';

// Палитра для тарифов на графике разбивки — см. TODO выше, пока не используется.
// const PLAN_COLOR_PALETTE = ['#2E6F8E', '#C77B3B', '#6B5B95', '#4C8C4A', '#B24A5B', '#7A8B99'];

type SeriesPoint = { month: string; label: string; value: number };

type AnalyticsData = {
  newUsers: SeriesPoint[];
  revenue: SeriesPoint[];
  averageCheck: SeriesPoint[];
  mrr: SeriesPoint[];
  activeUsers: SeriesPoint[];
  churn: SeriesPoint[];
  planBreakdown: {
    plans: { key: string; label: string }[];
    series: ({ month: string; label: string } & Record<string, number>)[];
  };
};

function toPoints(series: SeriesPoint[]): DynamicsPoint[] {
  return series.map((p) => ({ label: p.label, value: p.value }));
}

export default function AnalyticsPage() {
  const { query, result: response } = useCustom<AnalyticsData>({ url: '/admin/analytics', method: 'get' });
  const result = response?.data;

  if (query.isLoading) {
    return (
      <div className="space-y-3.5">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!result) {
    return <p className="text-muted-foreground">Не удалось загрузить аналитику.</p>;
  }

  // TODO(план-разбивка): см. TODO у импорта выше — временно не строим plans/
  // planBreakdownPoints, пока не вернёмся к этому графику.
  // const plans = result.planBreakdown.plans.map((plan, i) => ({
  //   key: plan.key,
  //   label: plan.label,
  //   colorVar: PLAN_COLOR_PALETTE[i % PLAN_COLOR_PALETTE.length],
  // }));
  // const planBreakdownPoints: PlanBreakdownPoint[] = result.planBreakdown.series.map((point) => ({
  //   label: point.label,
  //   ...Object.fromEntries(plans.map((plan) => [plan.key, point[plan.key] ?? 0])),
  // }));

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[21px] font-semibold tracking-tight">Аналитика</h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">Динамика ключевых показателей SellerIQ</p>
      </div>

      <div className="mb-3.5 grid grid-cols-1 items-start gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        <DynamicsChartCard
          title="Доход по месяцам"
          colorVar="var(--brand)"
          formatValue={formatCurrency}
          points={toPoints(result.revenue)}
        />
        <DynamicsChartCard
          title="Регулярный доход (MRR)"
          colorVar="var(--brand)"
          formatValue={formatCurrency}
          points={toPoints(result.mrr)}
        />
        <DynamicsChartCard
          title="Средний чек"
          colorVar="var(--brand)"
          formatValue={formatCurrency}
          points={toPoints(result.averageCheck)}
        />
        <DynamicsChartCard
          title="Новые пользователи по месяцам"
          colorVar="var(--foreground)"
          formatValue={(v) => String(v)}
          points={toPoints(result.newUsers)}
        />
        <DynamicsChartCard
          title="Активные пользователи"
          colorVar="var(--foreground)"
          formatValue={(v) => String(v)}
          points={toPoints(result.activeUsers)}
        />
        <DynamicsChartCard
          title="Отток"
          colorVar="var(--destructive)"
          formatValue={(v) => `${v}%`}
          points={toPoints(result.churn)}
        />
      </div>

      {/* TODO(план-разбивка): см. TODO у импорта выше — вернуть, когда решим,
          как показывать список тарифов (сейчас на бэке уже отфильтровано до
          тарифов с подписчиками в текущем месяце, см. getAnalytics.js).
      {plans.length > 0 && (
        <PlanBreakdownTrendCard title="Разбивка по тарифам во времени" plans={plans} points={planBreakdownPoints} />
      )} */}
    </div>
  );
}
