import { config } from '@config/env';
import type { Response } from 'express';

const COOKIE_BASE_OPTIONS = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: config.isProduction ? ('strict' as const) : ('lax' as const),
  domain: config.isProduction ? config.cookieDomain : undefined,
  path: '/',
};

function clearStaleCookies(res: Response): void {
  res.clearCookie('refresh_token', { ...COOKIE_BASE_OPTIONS, path: '/api' });
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  clearStaleCookies(res);

  res.cookie('access_token', accessToken, {
    ...COOKIE_BASE_OPTIONS,
    maxAge: config.jwtAccessTtlMs || 15 * 60 * 1000,
  });

  res.cookie('refresh_token', refreshToken, {
    ...COOKIE_BASE_OPTIONS,
    maxAge: config.jwtRefreshTtlMs || 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  clearStaleCookies(res);
  res.clearCookie('access_token', COOKIE_BASE_OPTIONS);
  res.clearCookie('refresh_token', COOKIE_BASE_OPTIONS);
}
