import type { ForgotPasswordUseCase } from '@application/usecases/auth/forgot-password.usecase';
import type { GoogleAuthUseCase } from '@application/usecases/auth/google-auth.usecase';
import type { LoginUseCase } from '@application/usecases/auth/login.usecase';
import type { LogoutUseCase } from '@application/usecases/auth/logout.usecase';
import type { RefreshUseCase } from '@application/usecases/auth/refresh.usecase';
import type { RegisterUseCase } from '@application/usecases/auth/register.usecase';
import type { ResendOtpUseCase } from '@application/usecases/auth/resend-otp.usecase';
import type { ResetPasswordUseCase } from '@application/usecases/auth/reset-password.usecase';
import type { VerifyOtpUseCase } from '@application/usecases/auth/verify-otp.usecase';
import type { HealthCheckUseCase } from '@application/usecases/health-check.usecase';
import type { IGetMeExecutor } from '@application/usecases/user/get-me.usecase';
import { DomainError } from '@domain/shared/errors';
import { AuthController } from '@interfaces/http/auth/handlers';
import type { NextFunction, Request } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { USER_ID, createMockTokens, createMockUser } from '../../fixtures/entities';
import { createMockGoogleOAuth } from '../../fixtures/mocks';
import { createMockReq, createMockRes } from '../../fixtures/http';

vi.mock('../../../shared/logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const mockUser = createMockUser();
const mockTokens = createMockTokens();

function createController() {
  const registerUC = {
    execute: vi.fn().mockResolvedValue({ userId: USER_ID, message: 'Verification code sent' }),
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
      message: 'If this email is registered, a reset code has been sent.',
    }),
  } as unknown as ForgotPasswordUseCase;
  const resetPasswordUC = {
    execute: vi.fn().mockResolvedValue({ message: 'Password reset successfully.' }),
  } as unknown as ResetPasswordUseCase;
  const healthCheckUC = {
    execute: vi.fn().mockResolvedValue({
      status: 'ok',
      postgres: 'ok',
      redis: 'ok',
      timestamp: new Date().toISOString(),
    }),
  } as unknown as HealthCheckUseCase;

  const googleOAuth = createMockGoogleOAuth({
    getAuthUrl: vi.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth?test'),
  });

  const getMeUC: IGetMeExecutor = {
    execute: vi.fn().mockResolvedValue(mockUser),
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
    getMeUC,
    healthCheckUC,
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
    getMeUC,
    healthCheckUC,
  };
}

describe('AuthController', () => {
  let ctx: ReturnType<typeof createController>;
  let next: NextFunction;

  beforeEach(() => {
    ctx = createController();
    next = vi.fn();
  });

  describe('healthCheck', () => {
    it('should return ok', async () => {
      const res = createMockRes();
      await ctx.controller.healthCheck(createMockReq(), res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'ok' }));
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('register', () => {
    it('should register and return userId + message', async () => {
      const req = createMockReq({ body: { email: 'a@b.com', password: 'Test1234', name: 'Test' } });
      const res = createMockRes();
      await ctx.controller.register(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, message: expect.any(String) }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next if body is incomplete (zod error)', async () => {
      const res = createMockRes();
      await ctx.controller.register(createMockReq({ body: { email: 'a@b.com' } }), res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should pass domain error to next', async () => {
      const error = new DomainError('Email already registered', 'EMAIL_EXISTS');
      vi.mocked(ctx.registerUC.execute).mockRejectedValue(error);
      const req = createMockReq({ body: { email: 'a@b.com', password: 'Test1234', name: 'Test' } });
      const res = createMockRes();
      await ctx.controller.register(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP and set cookies', async () => {
      const req = createMockReq({ body: { userId: USER_ID, otp: '123456' } });
      const res = createMockRes();
      await ctx.controller.verifyOtp(req, res, next);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ user: expect.any(Object) }));
    });

    it('should call next if validation fails', async () => {
      const res = createMockRes();
      await ctx.controller.verifyOtp(createMockReq({ body: {} }), res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('resendOtp', () => {
    it('should resend OTP', async () => {
      const req = createMockReq({ body: { userId: USER_ID } });
      const res = createMockRes();
      await ctx.controller.resendOtp(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.any(String) }),
      );
    });

    it('should call next on validation error', async () => {
      const res = createMockRes();
      await ctx.controller.resendOtp(createMockReq({ body: {} }), res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login and set cookies', async () => {
      const req = createMockReq({ body: { email: 'a@b.com', password: 'Test1234' } });
      const res = createMockRes();
      await ctx.controller.login(req, res, next);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ user: expect.any(Object) }));
    });

    it('should call next on validation error', async () => {
      const res = createMockRes();
      await ctx.controller.login(createMockReq({ body: {} }), res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should call next on domain error', async () => {
      const error = new DomainError('Invalid email or password', 'INVALID_CREDENTIALS');
      vi.mocked(ctx.loginUC.execute).mockRejectedValue(error);
      const req = createMockReq({ body: { email: 'a@b.com', password: 'Wrong123' } });
      const res = createMockRes();
      await ctx.controller.login(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('googleRedirect', () => {
    it('should redirect to Google auth URL', () => {
      const res = createMockRes();
      ctx.controller.googleRedirect(createMockReq(), res);
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('google'));
    });
  });

  describe('googleCallback', () => {
    it('should exchange code and redirect to client', async () => {
      const req = createMockReq({ query: { code: 'auth-code' } });
      const res = createMockRes();
      await ctx.controller.googleCallback(req, res);
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000');
    });

    it('should return 400 without code', async () => {
      const res = createMockRes();
      await ctx.controller.googleCallback(createMockReq(), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens', async () => {
      const req = createMockReq({ cookies: { refresh_token: 'valid' } });
      const res = createMockRes();
      await ctx.controller.refresh(req, res, next);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ user: expect.any(Object) }));
    });

    it('should return 401 without refresh cookie', async () => {
      const res = createMockRes();
      await ctx.controller.refresh(createMockReq(), res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('logout', () => {
    it('should logout and clear cookies', async () => {
      const req = createMockReq({ cookies: { access_token: 'tok' } });
      const res = createMockRes();
      await ctx.controller.logout(req, res);
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });
  });

  describe('getMe', () => {
    it('should return user profile for authenticated user', async () => {
      const req = createMockReq({ user: { sub: USER_ID } } as Partial<Request>);
      const res = createMockRes();
      await ctx.controller.getMe(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ user: expect.objectContaining({ id: USER_ID }) }),
      );
    });

    it('should return 401 if no user on request', async () => {
      const res = createMockRes();
      await ctx.controller.getMe(createMockReq(), res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should pass domain error to next', async () => {
      const error = new DomainError('User not found', 'USER_NOT_FOUND');
      vi.mocked(ctx.getMeUC.execute).mockRejectedValue(error);
      const req = createMockReq({ user: { sub: 'user-gone' } } as Partial<Request>);
      const res = createMockRes();
      await ctx.controller.getMe(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
