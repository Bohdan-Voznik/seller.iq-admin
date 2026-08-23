'use client';

import { useState, type PropsWithChildren } from 'react';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, CreditCard, LineChart, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/layout/logo';
import { NavLink } from '@/components/layout/nav-link';
import { SidebarUser } from '@/components/layout/sidebar-user';

function NavLinks() {
  return (
    <nav className="flex flex-1 flex-col gap-0.5">
      <NavLink href="/" icon={<LayoutDashboard />}>
        Главная
      </NavLink>
      <NavLink href="/analytics" icon={<LineChart />}>
        Аналитика
      </NavLink>
      <NavLink href="/users" icon={<Users />}>
        Пользователи
      </NavLink>
      <NavLink href="/bank-payment-requests" icon={<CreditCard />}>
        Платежи
      </NavLink>
      {/* Операции временно скрыты из навигации — см. TODO в CLAUDE.md, страница осталась в src/app/(protected)/operations */}
    </nav>
  );
}

export function AppShell({ children }: PropsWithChildren) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  // Закрываем мобильное меню при переходе на другую страницу — сравнение с
  // предыдущим pathname прямо в рендере (react-compiler ругается на
  // setState внутри useEffect), паттерн из доки React "adjusting state when
  // a prop changes".
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileNavOpen(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col md:flex-row">
      <div className="flex shrink-0 items-center justify-between border-b border-sidebar-border bg-sidebar px-3 py-2.5 text-sidebar-foreground md:hidden">
        <div className="flex items-center gap-2.5 text-[14.5px] font-semibold tracking-tight">
          <Logo className="size-6 shrink-0 rounded-md" />
          SellerIQ Admin
        </div>
        <Button variant="ghost" size="icon" aria-label="Открыть меню" onClick={() => setMobileNavOpen(true)}>
          <Menu />
        </Button>
      </div>

      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[232px] max-w-[80vw] shrink-0 -translate-x-full flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground transition-transform duration-200 md:static md:z-auto md:w-[232px] md:max-w-none md:translate-x-0',
          mobileNavOpen && 'translate-x-0',
        )}
      >
        <div className="flex items-center justify-between gap-2.5 px-2 pb-5 pt-1">
          <div className="flex items-center gap-2.5 text-[14.5px] font-semibold tracking-tight">
            <Logo className="size-6 shrink-0 rounded-md" />
            SellerIQ Admin
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Закрыть меню"
            className="text-sidebar-foreground md:hidden"
            onClick={() => setMobileNavOpen(false)}
          >
            <X />
          </Button>
        </div>
        <NavLinks />
        <SidebarUser />
      </aside>

      <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-7">{children}</main>
    </div>
  );
}
