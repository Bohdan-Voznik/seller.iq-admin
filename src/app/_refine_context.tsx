'use client';

import { Suspense, type PropsWithChildren } from 'react';
import { Refine } from '@refinedev/core';
import routerProvider from '@refinedev/nextjs-router';
import { authProviderClient } from '@/providers/auth-provider/auth-provider.client';
import { dataProvider } from '@/providers/data-provider';
import { Toaster } from '@/components/ui/sonner';

export function RefineContext({ children }: PropsWithChildren) {
  return (
    // @refinedev/nextjs-router читает useSearchParams() внутри — без Suspense
    // статическая генерация /_not-found падает (Next 15/16 требует границу
    // Suspense вокруг любого useSearchParams()).
    <Suspense>
      <Refine
        routerProvider={routerProvider}
        dataProvider={dataProvider}
        authProvider={authProviderClient}
        resources={[
          {
            name: 'users',
            list: '/users',
            show: '/users/show/:id',
            meta: { label: 'Пользователи' },
          },
          {
            name: 'bank-payment-requests',
            list: '/bank-payment-requests',
            meta: { label: 'Платежи' },
          },
        ]}
        options={{
          syncWithLocation: true,
          warnWhenUnsavedChanges: true,
          disableTelemetry: true,
        }}
      >
        {children}
        <Toaster />
      </Refine>
    </Suspense>
  );
}
