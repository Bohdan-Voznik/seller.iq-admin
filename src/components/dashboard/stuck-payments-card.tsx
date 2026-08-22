import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

type StuckPayment = {
  id: number;
  ownerId: number;
  ownerName: string | null;
  label: string;
  amount: string;
  currency: string;
  createdAt: string;
};

function hoursWaiting(createdAt: string) {
  return Math.round((Date.now() - new Date(createdAt).getTime()) / 36e5);
}

export function StuckPaymentsCard({ total, items }: { total: number; items: StuckPayment[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3.5 flex items-baseline justify-between">
        <div className="text-[13.5px] font-semibold">Зависшие платежи</div>
        <Link
          href="/bank-payment-requests"
          className="inline-flex items-center gap-px text-[11.5px] font-medium text-muted-foreground hover:text-brand"
        >
          Все платежи <ChevronRight className="size-3" />
        </Link>
      </div>
      <div className="mb-0.5 text-[22px] font-semibold tracking-tight">{total}</div>
      <div className="mb-3 text-[11.5px] text-muted-foreground">заявки ждут дольше 6 часов</div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Зависших заявок нет.</p>
      ) : (
        items.map((item) => (
          <Link
            key={item.id}
            href={`/users/show/${item.ownerId}`}
            className="flex items-center justify-between gap-2 border-b border-border py-2 last:border-0 last:pb-0"
          >
            <div className="min-w-0">
              <div className="truncate text-xs font-medium">{item.ownerName ?? `#${item.ownerId}`}</div>
              <div className="text-[11px] text-muted-foreground">
                {item.label} · {item.amount} {item.currency}
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-amber-bg px-2 py-px text-[10.5px] font-medium text-amber-fg">
              {hoursWaiting(item.createdAt)}ч
            </span>
          </Link>
        ))
      )}
    </div>
  );
}
