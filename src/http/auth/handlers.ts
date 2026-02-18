import type { IGoogleOAuthClient } from '@domain/auth/ports.js';
import { DomainError } from '@domain/shared/errors.js';
import type { UserProfile } from '@domain/user/entities.js';
import type { IUserRepository } from '@domain/user/ports.js';
import type { GoogleAuthUseCase } from '@usecases/auth/google-auth.usecase.js';
import type { LoginUseCase } from '@usecases/auth/login.usecase.js';
import type { LogoutUseCase } from '@usecases/auth/logout.usecase.js';
import type { RefreshUseCase } from '@usecases/auth/refresh.usecase.js';
import type { RegisterUseCase } from '@usecases/auth/register.usecase.js';
import type { Request, Response } from 'express';
import { logger } from '../../logger.js';
import { HttpStatus } from '../constants/http-status.enum.js';
import { clearAuthCookies, setAuthCookies } from '../helpers/cookie.helper.js';

function toUserResponse(user: UserProfile) {
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
    private readonly googleOAuth: IGoogleOAuthClient,
    private readonly userRepo: IUserRepository,
    private readonly clientUrl: string,
  ) {}

  healthCheck = (_req: Request, res: Response): void => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  };

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        res
          .status(HttpStatus.BAD_REQUEST)
          .json({ error: 'Email, password, and name are required' });
        return;
      }

      const result = await this.registerUC.execute({ email, password, name });
      setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

      res.status(HttpStatus.CREATED).json({ user: toUserResponse(result.user) });
    } catch (error) {
      handleAuthError(res, error);
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(HttpStatus.BAD_REQUEST).json({ error: 'Email and password are required' });
        return;
      }

      const result = await this.loginUC.execute({ email, password });
      setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

      res.json({ user: toUserResponse(result.user) });
    } catch (error) {
      handleAuthError(res, error);
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

  refresh = async (req: Request, res: Response): Promise<void> => {
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
      handleAuthError(res, error);
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const accessToken = req.cookies?.access_token;
      if (accessToken) await this.logoutUC.execute(accessToken);
      clearAuthCookies(res);
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      logger.error({ err: error }, 'Logout error');
      clearAuthCookies(res);
      res.json({ message: 'Logged out successfully' });
    }
  };

  getMe = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Not authenticated' });
        return;
      }

      const user = await this.userRepo.findById(userId);
      if (!user) {
        res.status(HttpStatus.NOT_FOUND).json({ error: 'User not found' });
        return;
      }

      res.json({
        user: {
          ...toUserResponse(user),
          phone: user.phone,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'Get me error');
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
  };
}

function handleAuthError(res: Response, error: unknown): void {
  if (error instanceof DomainError) {
    const statusMap: Record<string, HttpStatus> = {
      EMAIL_EXISTS: HttpStatus.CONFLICT,
      INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
      OAUTH_ACCOUNT: HttpStatus.BAD_REQUEST,
      INVALID_REFRESH_TOKEN: HttpStatus.UNAUTHORIZED,
      REFRESH_TOKEN_REVOKED: HttpStatus.UNAUTHORIZED,
      USER_NOT_FOUND: HttpStatus.NOT_FOUND,
    };
    res
      .status(statusMap[error.code] ?? HttpStatus.BAD_REQUEST)
      .json({ error: error.message, code: error.code });
    return;
  }

  logger.error({ err: error }, 'Unexpected auth error');
  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
}
