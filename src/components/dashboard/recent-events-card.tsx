import { formatRelativeTime } from '@/lib/format';

export function RecentEventsCard({ events }: { events: { text: string; at: string }[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3.5 text-[13.5px] font-semibold">Лента последних событий</div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Пока ничего не произошло.</p>
      ) : (
        <div>
          {events.map((event, i) => (
            <div
              key={`${event.at}-${i}`}
              className="flex gap-2.5 border-b border-border py-2 last:border-0 last:pb-0"
            >
              <div className="mt-1.5 size-[5px] shrink-0 rounded-full bg-muted-foreground" />
              <div className="text-xs leading-relaxed">{event.text}</div>
              <div className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                {formatRelativeTime(event.at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
