import { createRequireAuth } from '@interfaces/http/middleware/auth.middleware';
import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockTokenService,
  createMockTokenStore,
  createMockUserBlockStore,
} from '../../fixtures/mocks';
import { createMockReq, createMockRes } from '../../fixtures/http';

function createMocks() {
  return {
    tokenService: createMockTokenService({
      verifyAccessToken: vi.fn().mockReturnValue({
        typ: 'access',
        sub: 'user-1',
        jti: 'jti-1',
        email: 'test@example.com',
        name: 'Test',
        role: 'user',
        subscription: 'free',
      }),
    }),
    tokenStore: createMockTokenStore(),
    userBlockStore: createMockUserBlockStore(),
  };
}

describe('requireAuth middleware', () => {
  let mocks: ReturnType<typeof createMocks>;
  let requireAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  const next: NextFunction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = createMocks();
    requireAuth = createRequireAuth(mocks.tokenService, mocks.tokenStore, mocks.userBlockStore);
  });

  it('should call next and attach user on valid token', async () => {
    const req = createMockReq({ cookies: { access_token: 'valid-token' } });
    const res = createMockRes();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user?.sub).toBe('user-1');
  });

  it('should return 401 when no cookie', async () => {
    const req = createMockReq();
    const res = createMockRes();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'NO_TOKEN' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token is blacklisted', async () => {
    vi.mocked(mocks.tokenStore.isAccessTokenBlacklisted).mockResolvedValue(true);
    const req = createMockReq({ cookies: { access_token: 'blacklisted' } });
    const res = createMockRes();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOKEN_REVOKED' }));
  });

  it('should return 401 when token is invalid', async () => {
    vi.mocked(mocks.tokenService.verifyAccessToken).mockImplementation(() => {
      throw new Error('invalid');
    });
    const req = createMockReq({ cookies: { access_token: 'bad-token' } });
    const res = createMockRes();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_TOKEN' }));
  });

  it('should return 401 when a refresh token is used as access token', async () => {
    vi.mocked(mocks.tokenService.verifyAccessToken).mockReturnValue({
      typ: 'refresh' as unknown as 'access',
      sub: 'user-1',
      jti: 'jti-2',
      email: 'test@example.com',
      name: 'Test',
      role: 'user',
      subscription: 'free',
    });
    const req = createMockReq({ cookies: { access_token: 'refresh-token-value' } });
    const res = createMockRes();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_TOKEN' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when user is blocked', async () => {
    vi.mocked(mocks.userBlockStore.isUserBlocked).mockResolvedValue(true);
    const req = createMockReq({ cookies: { access_token: 'valid-token' } });
    const res = createMockRes();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'USER_BLOCKED' }));
    expect(next).not.toHaveBeenCalled();
  });
});
