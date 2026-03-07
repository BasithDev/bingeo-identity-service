import type { Response } from 'express';
import { config } from '../../config/env.js';

const COOKIE_BASE_OPTIONS = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: config.isProduction ? ('strict' as const) : ('lax' as const),
  domain: config.isProduction ? config.cookieDomain : undefined,
  path: '/',
};

/** Evicts the stale refresh_token cookie that used to be set with path='/api'.
 *  Without this, old browsers keep sending it instead of the new path='/' one. */
function clearStaleCookies(res: Response): void {
  res.clearCookie('refresh_token', { ...COOKIE_BASE_OPTIONS, path: '/api' });
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  clearStaleCookies(res); // evict old stale path='/api' cookie

  res.cookie('access_token', accessToken, {
    ...COOKIE_BASE_OPTIONS,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refresh_token', refreshToken, {
    ...COOKIE_BASE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  clearStaleCookies(res); // evict old stale path='/api' cookie
  res.clearCookie('access_token', COOKIE_BASE_OPTIONS);
  res.clearCookie('refresh_token', COOKIE_BASE_OPTIONS);
}
