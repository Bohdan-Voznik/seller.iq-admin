'use client';

import { useEffect, useRef, useState } from 'react';
import { Bar, BarChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import type { XAxisTickContentProps } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';

export type PlanSeriesDef = { key: string; label: string; colorVar: string };
export type PlanBreakdownPoint = { label: string; [planKey: string]: number | string };

// Тот же надёжный паттерн детекта активной точки через Pointer Events, что и
// в DynamicsChartCard (см. комментарий там) — recharts-хук useCartesianScale
// тут не нужен: направляющую линию рисует штатный <ReferenceLine x={...}/>
// по категориальному значению оси.
export function PlanBreakdownTrendCard({
  title,
  periodLabel = 'за 6 мес.',
  plans,
  points,
}: {
  title: string;
  periodLabel?: string;
  plans: PlanSeriesDef[];
  points: PlanBreakdownPoint[];
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const chartWrapRef = useRef<HTMLDivElement>(null);

  const lastIndex = points.length - 1;
  const activeIndex = hoverIndex ?? lastIndex;
  const activePoint = points[activeIndex];
  const activeTotal = activePoint ? plans.reduce((sum, p) => sum + Number(activePoint[p.key] ?? 0), 0) : 0;

  const chartConfig = Object.fromEntries(
    plans.map((p) => [p.key, { label: p.label, color: p.colorVar }]),
  ) satisfies ChartConfig;

  const updateFromClientX = (clientX: number) => {
    const el = chartWrapRef.current;
    if (!el || points.length === 0) return;
    const rect = el.getBoundingClientRect();
    const fraction = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    const clamped = Math.min(1, Math.max(0, fraction));
    setHoverIndex(Math.round(clamped * lastIndex));
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') setHoverIndex(null);
  };

  useEffect(() => {
    if (hoverIndex === null) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setHoverIndex(null);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [hoverIndex]);

  return (
    <div ref={cardRef} className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-1 flex items-baseline justify-between">
        <div className="text-[13.5px] font-semibold">{title}</div>
        <div className="text-[11px] text-muted-foreground">{periodLabel}</div>
      </div>
      {activePoint && (
        <div className="mb-2.5 flex items-baseline gap-2">
          <span className="text-[22px] font-semibold tracking-tight">{activeTotal}</span>
          {hoverIndex !== null && (
            <span className="text-[11px] font-medium text-muted-foreground">{activePoint.label}</span>
          )}
        </div>
      )}

      <div
        ref={chartWrapRef}
        className="touch-none"
        onPointerDown={(e) => updateFromClientX(e.clientX)}
        onPointerMove={(e) => updateFromClientX(e.clientX)}
        onPointerLeave={handlePointerLeave}
      >
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-24 w-full [&_.recharts-surface_g]:outline-hidden"
        >
          <BarChart data={points} margin={{ left: 16, right: 16, top: 8, bottom: 0 }} accessibilityLayer={false}>
            <YAxis hide domain={[0, 'dataMax']} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={0}
              tick={(props: XAxisTickContentProps) => {
                const isActive = props.index === activeIndex;
                return (
                  <text
                    x={props.x}
                    y={Number(props.y) + 4}
                    textAnchor="middle"
                    fontSize={10.5}
                    fontWeight={isActive ? 600 : 400}
                    fill={isActive ? 'var(--foreground)' : 'var(--muted-foreground)'}
                  >
                    {props.payload.value}
                  </text>
                );
              }}
            />
            {hoverIndex !== null && activePoint && (
              <ReferenceLine
                x={activePoint.label}
                stroke="var(--border)"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
            )}
            {plans.map((plan) => (
              <Bar key={plan.key} dataKey={plan.key} fill={plan.colorVar} radius={[2, 2, 0, 0]} isAnimationActive={false} />
            ))}
          </BarChart>
        </ChartContainer>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
        {plans.map((plan) => (
          <div key={plan.key} className="flex items-center gap-1.5 text-[11px]">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: plan.colorVar }} />
            <span className="text-muted-foreground">{plan.label}</span>
            <span className="font-semibold text-foreground">{activePoint?.[plan.key] ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
