import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

type ExpiringSubscription = {
  id: number;
  userId: number;
  ownerName: string | null;
  label: string;
  currentPeriodEnd: string;
};

function daysLeft(currentPeriodEnd: string) {
  return Math.max(0, Math.ceil((new Date(currentPeriodEnd).getTime() - Date.now()) / 864e5));
}

export function ExpiringSoonCard({ items }: { items: ExpiringSubscription[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3.5 flex items-baseline justify-between">
        <div className="text-[13.5px] font-semibold">Истекают в ближайшие 7 дней</div>
        <Link
          href="/users"
          className="inline-flex items-center gap-px text-[11.5px] font-medium text-muted-foreground hover:text-brand"
        >
          Все пользователи <ChevronRight className="size-3" />
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Ничего не истекает в ближайшую неделю.</p>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 border-b border-border py-2 last:border-0 last:pb-0"
          >
            <div className="min-w-0">
              <Link
                href={`/users/show/${item.userId}`}
                className="block truncate text-xs font-medium hover:text-brand hover:underline"
              >
                {item.ownerName ?? `#${item.userId}`}
              </Link>
              <div className="text-[11px] text-muted-foreground">{item.label}</div>
            </div>
            <span className="shrink-0 rounded-full border border-border px-2 py-px text-[10.5px] font-medium">
              через {daysLeft(item.currentPeriodEnd)} дн.
            </span>
          </div>
        ))
      )}
    </div>
  );
}
