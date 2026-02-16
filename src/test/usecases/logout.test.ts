import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../adapters/cache/token.store.js', () => ({
  tokenStore: {
    blacklistAccessToken: vi.fn(),
    deleteRefreshToken: vi.fn(),
  },
}));

vi.mock('../../usecases/auth/jwt.service.js', () => ({
  verifyAccessToken: vi.fn(),
  getRemainingSeconds: vi.fn(),
}));

import { tokenStore } from '../../adapters/cache/token.store.js';
import { getRemainingSeconds, verifyAccessToken } from '../../usecases/auth/jwt.service.js';
import { logout } from '../../usecases/auth/logout.usecase.js';

describe('logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAccessToken).mockReturnValue({
      sub: 'user-1',
      jti: 'jti-123',
      email: 'test@example.com',
      name: 'Test',
      role: 'user',
      subscription: 'free',
    });
    vi.mocked(getRemainingSeconds).mockReturnValue(600);
  });

  it('should blacklist access token and delete refresh token', async () => {
    await logout('valid-access-token');
    expect(tokenStore.blacklistAccessToken).toHaveBeenCalledWith('jti-123', 600);
    expect(tokenStore.deleteRefreshToken).toHaveBeenCalledWith('user-1');
  });

  it('should skip blacklisting if remaining is 0', async () => {
    vi.mocked(getRemainingSeconds).mockReturnValue(0);
    await logout('valid-access-token');
    expect(tokenStore.blacklistAccessToken).not.toHaveBeenCalled();
    expect(tokenStore.deleteRefreshToken).toHaveBeenCalled();
  });

  it('should gracefully handle expired token', async () => {
    vi.mocked(verifyAccessToken).mockImplementation(() => {
      throw new Error('expired');
    });
    await expect(logout('expired-token')).resolves.toBeUndefined();
  });
});
