'use client';

import { useEffect, useRef, useState } from 'react';
import { Area, AreaChart, XAxis, YAxis, useCartesianScale, usePlotArea } from 'recharts';
import type { XAxisTickContentProps } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';

export type DynamicsPoint = { label: string; value: number };

// recharts обновляет свой внутренний "active tooltip index" на touch-
// устройствах только по touchmove (см. state/touchEventsMiddleware.js) — на
// простом тапе без сдвига пальца событие не долетает, поэтому Tooltip/
// activeDot на мобильном срабатывали через раз. Детект активной точки и её
// подсветку делаем сами через Pointer Events (надёжно и для мыши, и для
// тача), а recharts используем только для рендера кривой/заливки/осей;
// точные пиксельные координаты активной точки берём через useCartesianScale,
// чтобы не дублировать вручную скейлинг/margin-математику recharts.
function ActiveMarker({ point, colorVar, showGuide }: { point: DynamicsPoint; colorVar: string; showGuide: boolean }) {
  const coord = useCartesianScale({ x: point.label, y: point.value });
  const plotArea = usePlotArea();
  if (!coord || !plotArea) return null;

  return (
    <>
      {showGuide && (
        <line
          x1={coord.x}
          x2={coord.x}
          y1={plotArea.y}
          y2={plotArea.y + plotArea.height}
          style={{ stroke: 'var(--border)' }}
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      )}
      <circle cx={coord.x} cy={coord.y} r={3.6} style={{ fill: colorVar, stroke: colorVar }} strokeWidth={1.4} />
    </>
  );
}

export function DynamicsChartCard({
  title,
  periodLabel = 'за 6 мес.',
  points,
  colorVar,
  formatValue,
}: {
  title: string;
  periodLabel?: string;
  points: DynamicsPoint[];
  /** CSS-переменная цвета линии/заливки, напр. "var(--brand)". */
  colorVar: string;
  formatValue: (value: number) => string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const chartWrapRef = useRef<HTMLDivElement>(null);

  const lastIndex = points.length - 1;
  const activeIndex = hoverIndex ?? lastIndex;
  const activePoint = points[activeIndex];

  const chartConfig = { value: { label: title, color: colorVar } } satisfies ChartConfig;
  const gradientId = `dyn-grad-${title.replace(/[^a-zA-Zа-яА-Я0-9]+/g, '-')}`;

  const updateFromClientX = (clientX: number) => {
    const el = chartWrapRef.current;
    if (!el || points.length === 0) return;
    const rect = el.getBoundingClientRect();
    const fraction = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    const clamped = Math.min(1, Math.max(0, fraction));
    setHoverIndex(Math.round(clamped * lastIndex));
  };

  // Десктопный hover: уводим мышь с графика — сбрасываем сразу, без клика.
  // Тач сюда не попадает (pointerType !== 'mouse'), поэтому на мобильном
  // точка остаётся выбранной до тапа вне карточки — см. следующий эффект.
  const handlePointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') setHoverIndex(null);
  };

  // На тач-устройствах нет mouseleave — точка "залипала" бы на последнем
  // тапе. Сбрасываем на текущий месяц при любом клике/тапе вне карточки.
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
          <span className="text-[22px] font-semibold tracking-tight">{formatValue(activePoint.value)}</span>
          {hoverIndex !== null && (
            <span className="text-[11px] font-medium text-muted-foreground">{activePoint.label}</span>
          )}
        </div>
      )}

      {/* На тапе recharts программно фокусирует внутренний <g class="recharts-
          zIndex-layer_*" tabindex="-1">, и браузер рисует дефолтный focus-
          outline вокруг всего графика — глушим его явно (shadcn'овский
          chart.tsx снимает outline только с surface/sector/layer, этот класс
          под него не попадает). */}
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
          <AreaChart data={points} margin={{ left: 16, right: 16, top: 8, bottom: 0 }} accessibilityLayer={false}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.28} />
                <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis dataKey="value" hide domain={['dataMin', 'dataMax']} />
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
            <Area
              dataKey="value"
              type="monotone"
              fill={`url(#${gradientId})`}
              stroke="var(--color-value)"
              strokeWidth={1.8}
              dot={{ r: 2, fill: 'var(--card)', stroke: 'var(--color-value)', strokeWidth: 1.4 }}
              activeDot={false}
              isAnimationActive={false}
            />
            {activePoint && <ActiveMarker point={activePoint} colorVar={colorVar} showGuide={hoverIndex !== null} />}
          </AreaChart>
        </ChartContainer>
      </div>
    </div>
  );
}
