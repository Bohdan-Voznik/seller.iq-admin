import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type KpiItem = {
  label: string;
  value: string;
  trend?: string;
  direction?: 'up' | 'down';
  /** Отформатированное значение "было" — показывается над процентом. */
  previousValue?: string;
};

export function KpiGroupCard({ title, items }: { title: string; items: KpiItem[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-1 text-[13.5px] font-semibold">{title}</div>
      {/* Таблица, а не флекс-ряды: колонки "значение" и "было / %" всегда сжаты
          точно по контенту (w-px + whitespace-nowrap — стандартный трюк, чтобы
          браузер не раздувал их лишним пространством от w-full), а колонка
          лейбла явно забирает весь остаток (w-full). */}
      <table className="w-full border-collapse table-auto">
        <tbody>
          {items.map((item) => {
            const Icon = item.direction === 'up' ? TrendingUp : TrendingDown;
            const showTrend = item.trend && item.direction && item.previousValue;

            return (
              <tr key={item.label} className="border-t border-border first:border-t-0">
                <td className="w-full py-2.5 pr-3 align-middle text-xs font-medium text-muted-foreground">
                  {item.label}
                </td>
                <td className="w-px whitespace-nowrap py-2.5 text-right align-middle">
                  <span className="text-[27px] font-semibold tracking-tight">{item.value}</span>
                </td>
                <td className="w-px whitespace-nowrap py-2.5 pl-3 text-right align-middle">
                  {showTrend && (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[10px] text-foreground/60">было {item.previousValue}</span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-0.5 text-[11px] font-medium',
                          item.direction === 'up' ? 'text-success-fg' : 'text-destructive',
                        )}
                      >
                        <Icon className="size-3" />
                        {item.trend!.replace(/^[+-]/, '')}
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
