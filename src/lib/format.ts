export function formatCurrency(value: number) {
  return `₴${Math.round(value).toLocaleString('ru-RU')}`;
}

export function trend(value: number, previousValue: number) {
  if (previousValue === 0) {
    return { direction: value > 0 ? ('up' as const) : ('down' as const), label: value > 0 ? '+100%' : '0%' };
  }
  const pct = Math.round(((value - previousValue) / previousValue) * 100);
  return {
    direction: pct >= 0 ? ('up' as const) : ('down' as const),
    label: `${pct >= 0 ? '+' : ''}${pct}%`,
  };
}

export function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return `${diffMin} мин назад`;

  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'час' : diffHours < 5 ? 'часа' : 'часов'} назад`;

  const isYesterday = new Date(Date.now() - 864e5).toDateString() === date.toDateString();
  if (isYesterday) {
    return `вчера, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}
