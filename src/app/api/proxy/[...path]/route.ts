import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { APP_VERSION_HEADER, BACKEND_API_URL, SESSION_COOKIE } from '@/lib/backend';

// Единственное место во всём приложении, где JWT покидает httpOnly cookie —
// и то только в заголовок исходящего запроса к rztk_backend, никогда обратно
// в JSON, который увидит браузер. Refine-хуки (useTable/useShow/useCustom)
// стучатся сюда же (см. src/providers/data-provider.ts), а не в backend
// напрямую, поэтому клиентский JS токен вообще не видит.
async function forward(req: NextRequest, path: string[]) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  const targetUrl = new URL(`${BACKEND_API_URL}/${path.join('/')}`);
  req.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const hasBody = !['GET', 'HEAD'].includes(req.method);
  const body = hasBody ? await req.text() : undefined;

  const backendRes = await fetch(targetUrl.toString(), {
    method: req.method,
    headers: {
      ...APP_VERSION_HEADER,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body,
    cache: 'no-store',
  });

  const responseBody = await backendRes.text();
  return new NextResponse(responseBody, {
    status: backendRes.status,
    headers: {
      'Content-Type': backendRes.headers.get('Content-Type') || 'application/json',
    },
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  return forward(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: RouteContext) {
  return forward(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: RouteContext) {
  return forward(req, (await ctx.params).path);
}
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return forward(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return forward(req, (await ctx.params).path);
}
