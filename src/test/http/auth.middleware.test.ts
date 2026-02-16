import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../adapters/cache/token.store.js', () => ({
  tokenStore: {
    isAccessTokenBlacklisted: vi.fn(),
  },
}));

vi.mock('../../usecases/auth/jwt.service.js', () => ({
  verifyAccessToken: vi.fn(),
}));

import type { NextFunction, Request, Response } from 'express';
import { tokenStore } from '../../adapters/cache/token.store.js';
import { requireAuth } from '../../http/auth.middleware.js';
import { verifyAccessToken } from '../../usecases/auth/jwt.service.js';

function mockReq(cookies: Record<string, string> = {}): Request {
  return { cookies } as unknown as Request;
}

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('requireAuth middleware', () => {
  const next: NextFunction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAccessToken).mockReturnValue({
      sub: 'user-1',
      jti: 'jti-1',
      email: 'test@example.com',
      name: 'Test',
      role: 'user',
      subscription: 'free',
    });
    vi.mocked(tokenStore.isAccessTokenBlacklisted).mockResolvedValue(false);
  });

  it('should call next and attach user on valid token', async () => {
    const req = mockReq({ access_token: 'valid-token' });
    const res = mockRes();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user?.sub).toBe('user-1');
  });

  it('should return 401 when no cookie', async () => {
    const req = mockReq();
    const res = mockRes();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'NO_TOKEN' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token is blacklisted', async () => {
    vi.mocked(tokenStore.isAccessTokenBlacklisted).mockResolvedValue(true);
    const req = mockReq({ access_token: 'blacklisted' });
    const res = mockRes();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOKEN_REVOKED' }));
  });

  it('should return 401 when token is invalid', async () => {
    vi.mocked(verifyAccessToken).mockImplementation(() => {
      throw new Error('invalid');
    });
    const req = mockReq({ access_token: 'bad-token' });
    const res = mockRes();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_TOKEN' }));
  });
});
