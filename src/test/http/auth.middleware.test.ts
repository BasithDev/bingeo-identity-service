import type { ITokenService, ITokenStore } from '@domain/auth/ports.js';
import { createRequireAuth } from '@http/middleware/auth.middleware.js';
import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function createMocks() {
  const tokenService: ITokenService = {
    signAccessToken: vi.fn(),
    signRefreshToken: vi.fn(),
    verifyAccessToken: vi.fn().mockReturnValue({
      sub: 'user-1',
      jti: 'jti-1',
      email: 'test@example.com',
      name: 'Test',
      role: 'user',
      subscription: 'free',
    }),
    verifyRefreshToken: vi.fn(),
    generateTokenPair: vi.fn(),
    getRefreshTtlSeconds: vi.fn(),
    getRemainingSeconds: vi.fn(),
  };

  const tokenStore: ITokenStore = {
    blacklistRefreshToken: vi.fn(),
    isRefreshTokenBlacklisted: vi.fn().mockResolvedValue(false),
    blacklistAccessToken: vi.fn(),
    isAccessTokenBlacklisted: vi.fn().mockResolvedValue(false),
  };

  return { tokenService, tokenStore };
}

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
  let mocks: ReturnType<typeof createMocks>;
  let requireAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  const next: NextFunction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = createMocks();
    requireAuth = createRequireAuth(mocks.tokenService, mocks.tokenStore);
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
    vi.mocked(mocks.tokenStore.isAccessTokenBlacklisted).mockResolvedValue(true);
    const req = mockReq({ access_token: 'blacklisted' });
    const res = mockRes();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOKEN_REVOKED' }));
  });

  it('should return 401 when token is invalid', async () => {
    vi.mocked(mocks.tokenService.verifyAccessToken).mockImplementation(() => {
      throw new Error('invalid');
    });
    const req = mockReq({ access_token: 'bad-token' });
    const res = mockRes();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_TOKEN' }));
  });
});
