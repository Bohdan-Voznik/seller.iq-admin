import { cn } from '@/lib/utils';

// label приходит с бэка (getPlanLabel из common/plans.js) — уже с фолбэком на
// сырой ключ, если тариф старый/снятый с продажи и лейбла для него больше
// нет. plan (сырой ключ) нужен только тут, чтобы подобрать цвет бейджа.
export function PlanBadge({ plan, label }: { plan: string; label: string }) {
  const tone =
    plan === 'trial'
      ? 'border border-border text-muted-foreground'
      : plan === 'internal_max'
        ? 'bg-foreground text-background'
        : 'bg-brand-tint text-brand';

  return (
    <span className={cn('inline-flex h-5 items-center rounded-full px-2.5 text-[11px] font-medium', tone)}>
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex h-5 items-center rounded-full border border-border px-2.5 text-[11px] font-medium text-muted-foreground">
        нет подписки
      </span>
    );
  }

  const tone =
    status === 'active' || status === 'paid'
      ? 'bg-success-bg text-success-fg'
      : status === 'expired'
        ? 'bg-destructive-bg text-destructive-fg'
        : status === 'pending' || status === 'processing'
          ? 'bg-amber-bg text-amber-fg'
          : 'border border-border text-foreground';

  return (
    <span className={cn('inline-flex h-5 items-center rounded-full px-2.5 text-[11px] font-medium', tone)}>
      {status}
    </span>
  );
}
