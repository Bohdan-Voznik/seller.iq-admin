import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/users/badges';

type Subscription = {
  id: number;
  plan: string;
  label: string;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  source: string;
  isActive: boolean;
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('ru-RU') : '—';
}

export function SubscriptionTimeline({ items }: { items: Subscription[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">История подписок пуста.</p>;
  }

  return (
    <div className="relative space-y-4 pl-5">
      <div className="absolute top-1 bottom-1 left-1 w-px bg-border" />
      {items.map((sub, i) => (
        <div key={sub.id} className="relative">
          <div
            className={cn(
              'absolute -left-5 top-1 size-[9px] rounded-full ring-2 ring-card',
              i === 0 ? 'bg-brand shadow-[0_0_0_1px_var(--brand)]' : 'bg-muted-foreground',
            )}
          />
          <div className="flex items-center gap-2 text-sm font-medium">
            {sub.label}
            <StatusBadge status={sub.isActive ? 'active' : 'expired'} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {formatDate(sub.currentPeriodStart)}
            <ArrowRight className="size-3" />
            {formatDate(sub.currentPeriodEnd)}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{sub.source}</div>
        </div>
      ))}
    </div>
  );
}
