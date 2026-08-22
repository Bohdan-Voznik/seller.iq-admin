export function PlanBreakdownCard({ items }: { items: { plan: string; label: string; count: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3.5 text-[13.5px] font-semibold">Разбивка по планам</div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет активных подписок.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.plan} className="flex items-center gap-2.5">
              <div className="w-[128px] shrink-0 truncate text-xs font-medium">{item.label}</div>
              <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
              <div className="w-[30px] shrink-0 text-right text-xs font-semibold">{item.count}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
