import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../config/env.js', () => ({
  config: {
    isProduction: false,
    cookieDomain: 'localhost',
  },
}));

import { clearAuthCookies, setAuthCookies } from '../../../interfaces/http/helpers/cookie.helper';
import { createMockRes } from '../../fixtures/http';

describe('cookie.helper', () => {
  describe('setAuthCookies', () => {
    it('should set access and refresh cookies', () => {
      const res = createMockRes();
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
      const res = createMockRes();
      setAuthCookies(res, 'access-tok', 'refresh-tok');

      expect(res.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({ path: '/api' }),
      );
    });
  });

  describe('clearAuthCookies', () => {
    it('should clear both cookies', () => {
      const res = createMockRes();
      clearAuthCookies(res);

      expect(res.clearCookie).toHaveBeenCalledWith('access_token', expect.any(Object));
      expect(res.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({ path: '/' }),
      );
    });

    it('should also clear the stale path=/api refresh_token cookie', () => {
      const res = createMockRes();
      clearAuthCookies(res);

      expect(res.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({ path: '/api' }),
      );
    });
  });
});
