import type { IGoogleOAuthClient } from '@domain/auth/ports.js';
import { DomainError } from '@domain/shared/errors.js';
import type { UserProfile } from '@domain/user/entities.js';
import type { IUserRepository } from '@domain/user/ports.js';
import { AuthController } from '@http/auth/handlers.js';
import type { ForgotPasswordUseCase } from '@usecases/auth/forgot-password.usecase.js';
import type { GoogleAuthUseCase } from '@usecases/auth/google-auth.usecase.js';
import type { LoginUseCase } from '@usecases/auth/login.usecase.js';
import type { LogoutUseCase } from '@usecases/auth/logout.usecase.js';
import type { RefreshUseCase } from '@usecases/auth/refresh.usecase.js';
import type { RegisterUseCase } from '@usecases/auth/register.usecase.js';
import type { ResendOtpUseCase } from '@usecases/auth/resend-otp.usecase.js';
import type { ResetPasswordUseCase } from '@usecases/auth/reset-password.usecase.js';
import type { VerifyOtpUseCase } from '@usecases/auth/verify-otp.usecase.js';
import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Prevent logger from producing output during tests
vi.mock('../../logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const mockUser: UserProfile = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test',
  role: 'user',
  subscription: 'free',
  emailVerified: true,
  phone: null,
  avatar: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTokens = { accessToken: 'access-tok', refreshToken: 'refresh-tok' };

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    query: {},
    cookies: {},
    user: undefined,
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function createController() {
  const registerUC = {
    execute: vi.fn().mockResolvedValue({ userId: 'user-1', message: 'Verification code sent' }),
  } as unknown as RegisterUseCase;
  const loginUC = {
    execute: vi.fn().mockResolvedValue({ user: mockUser, tokens: mockTokens }),
  } as unknown as LoginUseCase;
  const logoutUC = { execute: vi.fn() } as unknown as LogoutUseCase;
  const refreshUC = {
    execute: vi.fn().mockResolvedValue({ user: mockUser, tokens: mockTokens }),
  } as unknown as RefreshUseCase;
  const googleAuthUC = {
    execute: vi.fn().mockResolvedValue({ user: mockUser, tokens: mockTokens, isNewUser: false }),
  } as unknown as GoogleAuthUseCase;
  const verifyOtpUC = {
    execute: vi.fn().mockResolvedValue({ user: mockUser, tokens: mockTokens }),
  } as unknown as VerifyOtpUseCase;
  const resendOtpUC = {
    execute: vi.fn().mockResolvedValue({ message: 'New verification code sent' }),
  } as unknown as ResendOtpUseCase;
  const forgotPasswordUC = {
    execute: vi.fn().mockResolvedValue({
      userId: 'user-1',
      message: 'If this email is registered, a reset code has been sent.',
    }),
  } as unknown as ForgotPasswordUseCase;
  const resetPasswordUC = {
    execute: vi.fn().mockResolvedValue({ message: 'Password reset successfully.' }),
  } as unknown as ResetPasswordUseCase;

  const googleOAuth: IGoogleOAuthClient = {
    getAuthUrl: vi.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth?test'),
    exchangeCode: vi.fn(),
  };

  const userRepo: IUserRepository = {
    findById: vi.fn().mockResolvedValue(mockUser),
    findByEmail: vi.fn(),
    create: vi.fn(),
    updateSubscription: vi.fn(),
    updateProfile: vi.fn(),
    verifyEmail: vi.fn(),
  };

  const controller = new AuthController(
    registerUC,
    loginUC,
    logoutUC,
    refreshUC,
    googleAuthUC,
    verifyOtpUC,
    resendOtpUC,
    forgotPasswordUC,
    resetPasswordUC,
    googleOAuth,
    userRepo,
    'http://localhost:3000',
  );

  return {
    controller,
    registerUC,
    loginUC,
    logoutUC,
    refreshUC,
    googleAuthUC,
    verifyOtpUC,
    resendOtpUC,
    forgotPasswordUC,
    resetPasswordUC,
    googleOAuth,
    userRepo,
  };
}

describe('AuthController', () => {
  let ctx: ReturnType<typeof createController>;

  beforeEach(() => {
    ctx = createController();
  });

  describe('healthCheck', () => {
    it('should return ok', () => {
      const res = mockRes();
      ctx.controller.healthCheck(mockReq(), res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'ok' }));
    });
  });

  describe('register', () => {
    it('should register and return userId + message', async () => {
      const req = mockReq({ body: { email: 'a@b.com', password: 'Test1234', name: 'Test' } });
      const res = mockRes();
      await ctx.controller.register(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', message: expect.any(String) }),
      );
    });

    it('should return 400 if body is incomplete', async () => {
      const res = mockRes();
      await ctx.controller.register(mockReq({ body: { email: 'a@b.com' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should map DomainError to correct status', async () => {
      vi.mocked(ctx.registerUC.execute).mockRejectedValue(
        new DomainError('Email already registered', 'EMAIL_EXISTS'),
      );
      const req = mockReq({ body: { email: 'a@b.com', password: 'Test1234', name: 'Test' } });
      const res = mockRes();
      await ctx.controller.register(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP and set cookies', async () => {
      const req = mockReq({ body: { userId: 'user-1', otp: '123456' } });
      const res = mockRes();
      await ctx.controller.verifyOtp(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ user: expect.any(Object) }));
    });

    it('should return 400 if body is incomplete', async () => {
      const res = mockRes();
      await ctx.controller.verifyOtp(mockReq({ body: {} }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('resendOtp', () => {
    it('should resend OTP', async () => {
      const req = mockReq({ body: { userId: 'user-1' } });
      const res = mockRes();
      await ctx.controller.resendOtp(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.any(String) }),
      );
    });

    it('should return 400 without userId', async () => {
      const res = mockRes();
      await ctx.controller.resendOtp(mockReq({ body: {} }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('login', () => {
    it('should login and set cookies', async () => {
      const req = mockReq({ body: { email: 'a@b.com', password: 'Test1234' } });
      const res = mockRes();
      await ctx.controller.login(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ user: expect.any(Object) }));
    });

    it('should return 400 if body is incomplete', async () => {
      const res = mockRes();
      await ctx.controller.login(mockReq({ body: {} }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 401 on invalid credentials', async () => {
      vi.mocked(ctx.loginUC.execute).mockRejectedValue(
        new DomainError('Invalid email or password', 'INVALID_CREDENTIALS'),
      );
      const req = mockReq({ body: { email: 'a@b.com', password: 'wrong' } });
      const res = mockRes();
      await ctx.controller.login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('googleRedirect', () => {
    it('should redirect to Google auth URL', () => {
      const res = mockRes();
      ctx.controller.googleRedirect(mockReq(), res);
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('google'));
    });
  });

  describe('googleCallback', () => {
    it('should exchange code and redirect to client', async () => {
      const req = mockReq({ query: { code: 'auth-code' } });
      const res = mockRes();
      await ctx.controller.googleCallback(req, res);
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000');
    });

    it('should return 400 without code', async () => {
      const res = mockRes();
      await ctx.controller.googleCallback(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens', async () => {
      const req = mockReq({ cookies: { refresh_token: 'valid' } });
      const res = mockRes();
      await ctx.controller.refresh(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ user: expect.any(Object) }));
    });

    it('should return 401 without refresh cookie', async () => {
      const res = mockRes();
      await ctx.controller.refresh(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('logout', () => {
    it('should logout and clear cookies', async () => {
      const req = mockReq({ cookies: { access_token: 'tok' } });
      const res = mockRes();
      await ctx.controller.logout(req, res);
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });
  });

  describe('getMe', () => {
    it('should return user profile for authenticated user', async () => {
      const req = mockReq({ user: { sub: 'user-1' } } as Partial<Request>);
      const res = mockRes();
      await ctx.controller.getMe(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ user: expect.objectContaining({ id: 'user-1' }) }),
      );
    });

    it('should return 401 if no user on request', async () => {
      const res = mockRes();
      await ctx.controller.getMe(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(ctx.userRepo.findById).mockResolvedValue(null);
      const req = mockReq({ user: { sub: 'user-gone' } } as Partial<Request>);
      const res = mockRes();
      await ctx.controller.getMe(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
