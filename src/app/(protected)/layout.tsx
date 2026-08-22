import type { PropsWithChildren } from 'react';
import { redirect } from 'next/navigation';
import { LayoutDashboard, Users, CreditCard } from 'lucide-react';
import { authProviderServer } from '@/providers/auth-provider/auth-provider.server';
import { Logo } from '@/components/layout/logo';
import { NavLink } from '@/components/layout/nav-link';
import { SidebarUser } from '@/components/layout/sidebar-user';

export default async function ProtectedLayout({ children }: PropsWithChildren) {
  const { authenticated, redirectTo } = await authProviderServer.check();
  if (!authenticated) redirect(redirectTo ?? '/login');

  return (
    <div className="flex h-full min-h-0 flex-1">
      <aside className="flex w-[232px] shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground">
        <div className="flex items-center gap-2.5 px-2 pb-5 pt-1 text-[14.5px] font-semibold tracking-tight">
          <Logo className="size-6 shrink-0 rounded-md" />
          SellerIQ Admin
        </div>
        <nav className="flex flex-1 flex-col gap-0.5">
          <NavLink href="/" icon={<LayoutDashboard />}>
            Главная
          </NavLink>
          <NavLink href="/users" icon={<Users />}>
            Пользователи
          </NavLink>
          <NavLink href="/bank-payment-requests" icon={<CreditCard />}>
            Платежи
          </NavLink>
          {/* Операции временно скрыты из навигации — см. TODO в CLAUDE.md, страница осталась в src/app/(protected)/operations */}
        </nav>
        <SidebarUser />
      </aside>
      <main className="min-h-0 flex-1 overflow-y-auto p-7">{children}</main>
    </div>
  );
}
