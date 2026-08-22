import { NextRequest, NextResponse } from 'next/server';
import { APP_VERSION_HEADER, BACKEND_API_URL, SESSION_COOKIE } from '@/lib/backend';

// Логин в rztk_backend не требует пароля: GET /user/generate-code?name=
// находит-или-создаёт юзера по name и выдаёт одноразовый токен, который тут
// же обменивается на сессионный JWT через POST /user/login. Для админки это
// значит: единственный "секрет" — имя учётки, у которой в БД is_admin=true.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';

  if (!name) {
    return NextResponse.json({ error: 'NAME_REQUIRED' }, { status: 400 });
  }

  const codeRes = await fetch(
    `${BACKEND_API_URL}/user/generate-code?name=${encodeURIComponent(name)}`,
    { headers: APP_VERSION_HEADER },
  );
  if (!codeRes.ok) {
    const err = await codeRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.message || 'GENERATE_CODE_FAILED' },
      { status: codeRes.status },
    );
  }
  const { oneTimeToken } = await codeRes.json();

  const loginRes = await fetch(`${BACKEND_API_URL}/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...APP_VERSION_HEADER },
    body: JSON.stringify({ code: oneTimeToken }),
  });
  if (!loginRes.ok) {
    const err = await loginRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.message || 'LOGIN_FAILED' },
      { status: loginRes.status },
    );
  }
  const { token } = await loginRes.json();

  // Гейт "только админ" — прямо тут, чтобы не оставлять авторизованную, но
  // не-админскую cookie: /admin/* всё равно защищён на бэкенде, но панель
  // никому, кроме админов, не должна даже казаться залогиненной.
  const meRes = await fetch(`${BACKEND_API_URL}/user/me`, {
    headers: { Authorization: `Bearer ${token}`, ...APP_VERSION_HEADER },
  });
  const me = meRes.ok ? await meRes.json() : null;
  if (!me?.isAdmin) {
    return NextResponse.json({ error: 'NOT_ADMIN' }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // как и сам JWT на бэкенде (expiresIn: '1y')
  });
  return response;
}
