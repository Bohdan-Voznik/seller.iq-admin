import type { PropsWithChildren } from 'react';
import { redirect } from 'next/navigation';
import { authProviderServer } from '@/providers/auth-provider/auth-provider.server';
import { AppShell } from '@/components/layout/app-shell';

export default async function ProtectedLayout({ children }: PropsWithChildren) {
  const { authenticated, redirectTo } = await authProviderServer.check();
  if (!authenticated) redirect(redirectTo ?? '/login');

  return <AppShell>{children}</AppShell>;
}
