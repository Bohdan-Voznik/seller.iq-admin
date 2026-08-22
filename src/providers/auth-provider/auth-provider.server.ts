import type { AuthProvider } from '@refinedev/core';
import { cookies } from 'next/headers';
import { APP_VERSION_HEADER, BACKEND_API_URL, SESSION_COOKIE } from '@/lib/backend';

// Используется только в (protected)/layout.tsx (Server Component) для
// раннего редиректа до рендера страницы — читает JWT напрямую из httpOnly
// cookie (доступно только на сервере) и бьёт в rztk_backend напрямую, минуя
// прокси (не нужен, мы уже на сервере). Реальная граница доступа всё равно
// на бэкенде (admin.middleware.js) — это только UX-гейт.
export const authProviderServer: Pick<AuthProvider, 'check'> = {
  check: async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (!token) {
      return { authenticated: false, logout: true, redirectTo: '/login' };
    }

    try {
      const res = await fetch(`${BACKEND_API_URL}/user/me`, {
        headers: { Authorization: `Bearer ${token}`, ...APP_VERSION_HEADER },
        cache: 'no-store',
      });
      if (res.ok) {
        const me = await res.json();
        if (me.isAdmin) return { authenticated: true };
      }
    } catch {
      // сеть/бэкенд недоступны — считаем неавторизованным, не роняем страницу
    }

    return { authenticated: false, logout: true, redirectTo: '/login' };
  },
};
