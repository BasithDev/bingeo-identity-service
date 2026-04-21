import type { HealthCheckUseCase } from '@application/usecases/health-check.usecase';
import type { ForgotPasswordUseCase } from '@application/usecases/auth/forgot-password.usecase';
import type { GoogleAuthUseCase } from '@application/usecases/auth/google-auth.usecase';
import type { LoginUseCase } from '@application/usecases/auth/login.usecase';
import type { LogoutUseCase } from '@application/usecases/auth/logout.usecase';
import type { RefreshUseCase } from '@application/usecases/auth/refresh.usecase';
import type { RegisterUseCase } from '@application/usecases/auth/register.usecase';
import type { ResendOtpUseCase } from '@application/usecases/auth/resend-otp.usecase';
import type { ResetPasswordUseCase } from '@application/usecases/auth/reset-password.usecase';
import type { VerifyOtpUseCase } from '@application/usecases/auth/verify-otp.usecase';
import type { IGetMeExecutor } from '@application/usecases/user/get-me.usecase';
import type { IGoogleOAuthClient } from '@domain/auth/ports';
import { DomainError } from '@domain/shared/errors';
import type { IUserProfile } from '@domain/user/entities';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../../shared/logger';
import { HttpStatus } from '../constants/http-status.enum';
import { clearAuthCookies, setAuthCookies } from '../helpers/cookie.helper';
import {
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
  ResendOtpSchema,
  ResetPasswordSchema,
  VerifyOtpSchema,
} from './schemas';

function toUserResponse(user: IUserProfile) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    subscription: user.subscription,
  };
}

export class AuthController {
  constructor(
    private readonly registerUC: RegisterUseCase,
    private readonly loginUC: LoginUseCase,
    private readonly logoutUC: LogoutUseCase,
    private readonly refreshUC: RefreshUseCase,
    private readonly googleAuthUC: GoogleAuthUseCase,
    private readonly verifyOtpUC: VerifyOtpUseCase,
    private readonly resendOtpUC: ResendOtpUseCase,
    private readonly forgotPasswordUC: ForgotPasswordUseCase,
    private readonly resetPasswordUC: ResetPasswordUseCase,
    private readonly googleOAuth: IGoogleOAuthClient,
    private readonly getMeUC: IGetMeExecutor,
    private readonly healthCheckUC: HealthCheckUseCase,
    private readonly clientUrl: string,
  ) {}

  healthCheck = async (_req: Request, res: Response): Promise<void> => {
    const result = await this.healthCheckUC.execute();
    const status = result.status === 'ok' ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR;
    res.status(status).json(result);
  };

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, name } = RegisterSchema.parse(req.body);
      const result = await this.registerUC.execute({ email, password, name });
      res.status(HttpStatus.CREATED).json(result);
    } catch (error) {
      next(error);
    }
  };

  verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, otp } = VerifyOtpSchema.parse(req.body);
      const result = await this.verifyOtpUC.execute({ userId, otp });
      setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
      res.json({ user: toUserResponse(result.user) });
    } catch (error) {
      next(error);
    }
  };

  resendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = ResendOtpSchema.parse(req.body);
      const result = await this.resendOtpUC.execute({ userId });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = ForgotPasswordSchema.parse(req.body);
      const result = await this.forgotPasswordUC.execute({ email });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, otp, newPassword } = ResetPasswordSchema.parse(req.body);
      const result = await this.resetPasswordUC.execute({ email, otp, newPassword });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = LoginSchema.parse(req.body);
      const result = await this.loginUC.execute({ email, password });
      setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
      res.json({ user: toUserResponse(result.user) });
    } catch (error) {
      next(error);
    }
  };

  googleRedirect = (_req: Request, res: Response): void => {
    res.redirect(this.googleOAuth.getAuthUrl());
  };

  googleCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.query;
      if (!code || typeof code !== 'string') {
        res.status(HttpStatus.BAD_REQUEST).json({ error: 'Authorization code is required' });
        return;
      }

      const result = await this.googleAuthUC.execute(code);
      setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
      res.redirect(this.clientUrl);
    } catch (error) {
      logger.error({ err: error }, 'Google OAuth callback failed');
      res.redirect(`${this.clientUrl}/login?error=oauth_failed`);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies?.refresh_token;
      if (!refreshToken) {
        res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ error: 'Refresh token is required', code: 'NO_REFRESH_TOKEN' });
        return;
      }

      const result = await this.refreshUC.execute(refreshToken);
      setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
      res.json({ user: toUserResponse(result.user) });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const accessToken = req.cookies?.access_token;
      const refreshToken = req.cookies?.refresh_token;
      if (accessToken) await this.logoutUC.execute(accessToken, refreshToken);
      clearAuthCookies(res);
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      logger.error({ err: error }, 'Logout error');
      clearAuthCookies(res);
      res.json({ message: 'Logged out successfully' });
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Not authenticated' });
        return;
      }

      const user = await this.getMeUC.execute(userId);
      res.json({
        user: {
          ...toUserResponse(user),
          phone: user.phone,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
