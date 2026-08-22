import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/backend';

// Быстрая, дешёвая проверка "cookie вообще есть" — без похода в бэкенд
// (это делает authProviderServer.check() в (protected)/layout.tsx). Кто-то с
// валидной cookie, но isAdmin=false, сюда пройдёт и будет отброшен уже там —
// middleware ловит только самый частый случай (гость без сессии вообще).
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has(SESSION_COOKIE);

  if (!hasSession && req.nextUrl.pathname !== '/login') {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && req.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
