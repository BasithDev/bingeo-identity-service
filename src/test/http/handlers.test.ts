import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../usecases/auth/register.usecase.js', () => ({ register: vi.fn() }));
vi.mock('../../usecases/auth/login.usecase.js', () => ({ login: vi.fn() }));
vi.mock('../../usecases/auth/google-auth.usecase.js', () => ({ googleAuth: vi.fn() }));
vi.mock('../../usecases/auth/refresh.usecase.js', () => ({ refreshTokens: vi.fn() }));
vi.mock('../../usecases/auth/logout.usecase.js', () => ({ logout: vi.fn() }));
vi.mock('../../adapters/external/google-oauth.client.js', () => ({
  getGoogleAuthUrl: vi.fn().mockReturnValue('https://accounts.google.com/auth'),
}));
vi.mock('../../adapters/db/user.repository.js', () => ({
  userRepository: { findById: vi.fn() },
}));
vi.mock('../../http/cookie.helper.js', () => ({
  setAuthCookies: vi.fn(),
  clearAuthCookies: vi.fn(),
}));
vi.mock('../../config/env.js', () => ({
  config: { clientUrl: 'http://localhost:5173' },
}));
vi.mock('../../logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import type { Request, Response } from 'express';
import { userRepository } from '../../adapters/db/user.repository.js';
import { DomainError } from '../../domain/shared/errors.js';
import {
  getMeHandler,
  googleCallbackHandler,
  googleRedirectHandler,
  healthCheck,
  loginHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
} from '../../http/auth/handlers.js';
import { clearAuthCookies, setAuthCookies } from '../../http/cookie.helper.js';
import { googleAuth } from '../../usecases/auth/google-auth.usecase.js';
import { login } from '../../usecases/auth/login.usecase.js';
import { logout as logoutUseCase } from '../../usecases/auth/logout.usecase.js';
import { refreshTokens } from '../../usecases/auth/refresh.usecase.js';
import { register } from '../../usecases/auth/register.usecase.js';

const mockUser = {
  id: 'u1',
  email: 'a@b.com',
  name: 'Test',
  role: 'user' as const,
  subscription: 'free' as const,
  phone: null,
  avatar: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTokens = { accessToken: 'at', refreshToken: 'rt' };

function mockReq(overrides: Partial<Request> = {}): Request {
  return { body: {}, query: {}, cookies: {}, user: undefined, ...overrides } as unknown as Request;
}

function mockRes(): Response & Record<string, ReturnType<typeof vi.fn>> {
  const res: Record<string, unknown> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.redirect = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  return res as Response & Record<string, ReturnType<typeof vi.fn>>;
}

describe('handlers', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('healthCheck', () => {
    it('should return ok', () => {
      const res = mockRes();
      healthCheck(mockReq(), res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'ok' }));
    });
  });

  describe('registerHandler', () => {
    it('should return 400 when fields missing', async () => {
      const res = mockRes();
      await registerHandler(mockReq({ body: {} }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should register and set cookies', async () => {
      vi.mocked(register).mockResolvedValue({ user: mockUser, tokens: mockTokens });
      const res = mockRes();
      await registerHandler(
        mockReq({ body: { email: 'a@b.com', password: 'P1', name: 'T' } }),
        res,
      );
      expect(setAuthCookies).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle domain error', async () => {
      vi.mocked(register).mockRejectedValue(
        new DomainError('Email already registered', 'EMAIL_EXISTS'),
      );
      const res = mockRes();
      await registerHandler(
        mockReq({ body: { email: 'a@b.com', password: 'P1', name: 'T' } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('should handle unexpected error', async () => {
      vi.mocked(register).mockRejectedValue(new Error('db down'));
      const res = mockRes();
      await registerHandler(
        mockReq({ body: { email: 'a@b.com', password: 'P1', name: 'T' } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('loginHandler', () => {
    it('should return 400 when fields missing', async () => {
      const res = mockRes();
      await loginHandler(mockReq({ body: {} }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should login and set cookies', async () => {
      vi.mocked(login).mockResolvedValue({ user: mockUser, tokens: mockTokens });
      const res = mockRes();
      await loginHandler(mockReq({ body: { email: 'a@b.com', password: 'P1' } }), res);
      expect(setAuthCookies).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });
    it('should handle login domain error', async () => {
      vi.mocked(login).mockRejectedValue(
        new DomainError('Invalid email or password', 'INVALID_CREDENTIALS'),
      );
      const res = mockRes();
      await loginHandler(mockReq({ body: { email: 'a@b.com', password: 'P1' } }), res);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('googleRedirectHandler', () => {
    it('should redirect to Google', () => {
      const res = mockRes();
      googleRedirectHandler(mockReq(), res);
      expect(res.redirect).toHaveBeenCalledWith('https://accounts.google.com/auth');
    });
  });

  describe('googleCallbackHandler', () => {
    it('should return 400 when code missing', async () => {
      const res = mockRes();
      await googleCallbackHandler(mockReq({ query: {} }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should redirect to client on success', async () => {
      vi.mocked(googleAuth).mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
        isNewUser: false,
      });
      const res = mockRes();
      await googleCallbackHandler(
        mockReq({ query: { code: 'auth-code' } } as Partial<Request>),
        res,
      );
      expect(setAuthCookies).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:5173');
    });

    it('should redirect to login with error on failure', async () => {
      vi.mocked(googleAuth).mockRejectedValue(new Error('oauth fail'));
      const res = mockRes();
      await googleCallbackHandler(
        mockReq({ query: { code: 'bad-code' } } as Partial<Request>),
        res,
      );
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:5173/login?error=oauth_failed');
    });
  });

  describe('refreshHandler', () => {
    it('should return 401 when no refresh cookie', async () => {
      const res = mockRes();
      await refreshHandler(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should refresh and set cookies', async () => {
      vi.mocked(refreshTokens).mockResolvedValue({ user: mockUser, tokens: mockTokens });
      const res = mockRes();
      await refreshHandler(mockReq({ cookies: { refresh_token: 'rt' } } as Partial<Request>), res);
      expect(setAuthCookies).toHaveBeenCalled();
    });

    it('should handle refresh domain error', async () => {
      vi.mocked(refreshTokens).mockRejectedValue(
        new DomainError('Refresh token has been revoked', 'REFRESH_TOKEN_REVOKED'),
      );
      const res = mockRes();
      await refreshHandler(mockReq({ cookies: { refresh_token: 'rt' } } as Partial<Request>), res);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('logoutHandler', () => {
    it('should logout and clear cookies', async () => {
      vi.mocked(logoutUseCase).mockResolvedValue(undefined);
      const res = mockRes();
      await logoutHandler(mockReq({ cookies: { access_token: 'at' } } as Partial<Request>), res);
      expect(clearAuthCookies).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });

    it('should clear cookies even on error', async () => {
      vi.mocked(logoutUseCase).mockRejectedValue(new Error('fail'));
      const res = mockRes();
      await logoutHandler(mockReq({ cookies: { access_token: 'at' } } as Partial<Request>), res);
      expect(clearAuthCookies).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });

    it('should handle no access token cookie', async () => {
      const res = mockRes();
      await logoutHandler(mockReq(), res);
      expect(logoutUseCase).not.toHaveBeenCalled();
      expect(clearAuthCookies).toHaveBeenCalled();
    });
  });

  describe('getMeHandler', () => {
    it('should return 401 when no user on req', async () => {
      const res = mockRes();
      await getMeHandler(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 404 when user not in DB', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);
      const res = mockRes();
      await getMeHandler(mockReq({ user: { sub: 'u1' } } as Partial<Request>), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return user profile', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      const res = mockRes();
      await getMeHandler(mockReq({ user: { sub: 'u1' } } as Partial<Request>), res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ user: expect.objectContaining({ id: 'u1' }) }),
      );
    });

    it('should handle unexpected error', async () => {
      vi.mocked(userRepository.findById).mockRejectedValue(new Error('db fail'));
      const res = mockRes();
      await getMeHandler(mockReq({ user: { sub: 'u1' } } as Partial<Request>), res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
