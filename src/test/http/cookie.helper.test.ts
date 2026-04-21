import { describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env.js', () => ({
  config: {
    isProduction: false,
    cookieDomain: 'localhost',
  },
}));

import type { Response } from 'express';
import { clearAuthCookies, setAuthCookies } from '../../http/helpers/cookie.helper.js';

function mockRes(): Response & {
  cookie: ReturnType<typeof vi.fn>;
  clearCookie: ReturnType<typeof vi.fn>;
} {
  return {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as Response & {
    cookie: ReturnType<typeof vi.fn>;
    clearCookie: ReturnType<typeof vi.fn>;
  };
}

describe('cookie.helper', () => {
  describe('setAuthCookies', () => {
    it('should set access and refresh cookies', () => {
      const res = mockRes();
      setAuthCookies(res, 'access-tok', 'refresh-tok');

      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'access-tok',
        expect.objectContaining({ httpOnly: true, maxAge: 15 * 60 * 1000 }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-tok',
        expect.objectContaining({ httpOnly: true, path: '/' }),
      );
    });

    it('should clear the stale path=/api refresh_token cookie', () => {
      const res = mockRes();
      setAuthCookies(res, 'access-tok', 'refresh-tok');

      // Must evict the old cookie that used to live at path=/api
      expect(res.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({ path: '/api' }),
      );
    });
  });

  describe('clearAuthCookies', () => {
    it('should clear both cookies', () => {
      const res = mockRes();
      clearAuthCookies(res);

      // At least access_token and refresh_token at path='/'
      expect(res.clearCookie).toHaveBeenCalledWith('access_token', expect.any(Object));
      expect(res.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({ path: '/' }),
      );
    });

    it('should also clear the stale path=/api refresh_token cookie', () => {
      const res = mockRes();
      clearAuthCookies(res);

      expect(res.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({ path: '/api' }),
      );
    });
  });
});
