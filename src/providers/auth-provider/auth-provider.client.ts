'use client';

import type { AuthProvider } from '@refinedev/core';

// check()/getIdentity() не могут просто прочитать cookie (она httpOnly —
// специально, чтобы JWT не был доступен из браузерного JS) — вместо этого
// спрашивают сервер через прокси, который сам знает токен.
async function fetchMe(): Promise<{ name: string; isAdmin: boolean } | null> {
  const res = await fetch('/api/proxy/user/me', { credentials: 'include' });
  if (!res.ok) return null;
  const me = await res.json();
  return { name: me.name, isAdmin: !!me.isAdmin };
}

export const authProviderClient: AuthProvider = {
  login: async ({ name }: { name: string }) => {
    const res = await fetch('/api/session/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
      credentials: 'include',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message =
        body.error === 'NOT_ADMIN'
          ? 'У этой учётной записи нет прав администратора'
          : 'Не удалось войти — проверьте имя учётки';
      return {
        success: false,
        error: { name: 'LoginError', message },
      };
    }

    return { success: true, redirectTo: '/' };
  },

  logout: async () => {
    await fetch('/api/session/logout', { method: 'POST', credentials: 'include' });
    return { success: true, redirectTo: '/login' };
  },

  check: async () => {
    const me = await fetchMe();
    if (me?.isAdmin) return { authenticated: true };
    return { authenticated: false, logout: true, redirectTo: '/login' };
  },

  getIdentity: async () => {
    const me = await fetchMe();
    return me ? { id: me.name, name: me.name } : null;
  },

  onError: async (error) => {
    if (error?.statusCode === 401 || error?.statusCode === 403) {
      return { logout: true, redirectTo: '/login' };
    }
    return { error };
  },
};
