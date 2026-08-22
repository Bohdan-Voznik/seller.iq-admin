'use client';

import type { DataProvider } from '@refinedev/core';

// Кастомный data provider вместо @refinedev/simple-rest: rztk_backend
// возвращает списки как { data, total, page, pageSize } в теле ответа, а
// simple-rest ждёт total в заголовке X-Total-Count и сырой массив в теле —
// формат не совпадает, проще и честнее написать провайдер под реальный
// контракт бэкенда, чем подгонять один под другой.
const PROXY_URL = '/api/proxy';

function buildQuery(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      usp.set(key, String(value));
    }
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

async function parseErrorResponse(res: Response) {
  const body = await res.json().catch(() => ({}) as Record<string, unknown>);
  return {
    message: (body.error as string) || (body.message as string) || res.statusText,
    statusCode: res.status,
  };
}

export const dataProvider: DataProvider = {
  getList: async ({ resource, pagination, filters }) => {
    const { currentPage = 1, pageSize = 20 } = pagination ?? {};
    const params: Record<string, unknown> = { page: currentPage, pageSize };

    (filters ?? []).forEach((filter) => {
      if ('field' in filter) params[filter.field] = filter.value;
    });

    const res = await fetch(`${PROXY_URL}/admin/${resource}${buildQuery(params)}`, {
      credentials: 'include',
    });
    if (!res.ok) throw await parseErrorResponse(res);

    const json = await res.json();
    return { data: json.data, total: json.total };
  },

  getOne: async ({ resource, id }) => {
    const res = await fetch(`${PROXY_URL}/admin/${resource}/${id}`, {
      credentials: 'include',
    });
    if (!res.ok) throw await parseErrorResponse(res);

    const json = await res.json();
    return { data: json.data };
  },

  custom: async ({ url, method = 'get', payload, query }) => {
    const fullUrl = `${PROXY_URL}${url}${query ? buildQuery(query) : ''}`;
    const hasBody = !['get', 'head'].includes(method);

    const res = await fetch(fullUrl, {
      method: method.toUpperCase(),
      credentials: 'include',
      headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
      body: hasBody ? JSON.stringify(payload ?? {}) : undefined,
    });
    if (!res.ok) throw await parseErrorResponse(res);

    const json = await res.json().catch(() => ({}));
    return { data: (json.data ?? json) as never };
  },

  // Все ресурсы read-only в этой панели — изменения идут через именованные
  // POST-экшны (grantSubscription и т.п.) через custom(), а не generic CRUD.
  create: async () => {
    throw new Error('create() не поддерживается — используйте custom()');
  },
  update: async () => {
    throw new Error('update() не поддерживается — используйте custom()');
  },
  deleteOne: async () => {
    throw new Error('deleteOne() не поддерживается');
  },

  getApiUrl: () => PROXY_URL,
};
