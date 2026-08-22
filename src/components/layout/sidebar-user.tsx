'use client';

import { useGetIdentity, useLogout } from '@refinedev/core';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Identity = { id: string; name: string };

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

export function SidebarUser() {
  const { data: identity } = useGetIdentity<Identity>();
  const { mutate: logout } = useLogout();

  const name = identity?.name ?? '…';

  return (
    <div className="mt-3 flex items-center justify-between border-t border-sidebar-border pt-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-brand-tint text-[11.5px] font-semibold text-brand">
          {initials(name)}
        </div>
        <span className="truncate text-[12.5px] font-medium">{name}</span>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Выйти"
        onClick={() => logout()}
        className="shrink-0 text-muted-foreground"
      >
        <LogOut />
      </Button>
    </div>
  );
}
