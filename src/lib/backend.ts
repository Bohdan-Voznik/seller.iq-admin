// Адрес rztk_backend — используется только на сервере (route handlers,
// auth-provider.server), никогда в клиентском бандле. Сам URL не секрет,
// секрет — JWT из /user/login, который сюда не попадает: он живёт только в
// httpOnly cookie SESSION_COOKIE, выставленной в app/api/session/login.
export const BACKEND_API_URL =
  process.env.BACKEND_API_URL || 'http://127.0.0.1:3006';

export const SESSION_COOKIE = 'admin_session';

// rztk_backend's appVersionMiddleware 426s any request without x-app-version
// unless the path is explicitly exempted. /admin/* is exempted (this app is
// its only non-Electron caller — see appVersion.middleware.js), but
// /user/generate-code, /user/login and /user/me are shared with rztk_app's
// real login flow, so we send a real (if arbitrary) satisfying version
// instead of asking the backend to stop gating its own app's login.
export const APP_VERSION_HEADER = { 'x-app-version': '1.7.0' };
