import type { Request, Response } from 'express';
import { userRepository } from '../../adapters/db/user.repository.js';
import { getGoogleAuthUrl } from '../../adapters/external/google-oauth.client.js';
import { config } from '../../config/env.js';
import { DomainError } from '../../domain/shared/errors.js';
import { logger } from '../../logger.js';
import { googleAuth } from '../../usecases/auth/google-auth.usecase.js';
import { login } from '../../usecases/auth/login.usecase.js';
import { logout as logoutUseCase } from '../../usecases/auth/logout.usecase.js';
import { refreshTokens } from '../../usecases/auth/refresh.usecase.js';
import { register } from '../../usecases/auth/register.usecase.js';
import { clearAuthCookies, setAuthCookies } from '../cookie.helper.js';

export const healthCheck = (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
};

export async function registerHandler(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required' });
      return;
    }

    const result = await register({ email, password, name });
    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

    res.status(201).json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        subscription: result.user.subscription,
      },
    });
  } catch (error) {
    handleAuthError(res, error);
  }
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const result = await login({ email, password });
    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

    res.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        subscription: result.user.subscription,
      },
    });
  } catch (error) {
    handleAuthError(res, error);
  }
}

export function googleRedirectHandler(_req: Request, res: Response): void {
  res.redirect(getGoogleAuthUrl());
}

export async function googleCallbackHandler(req: Request, res: Response): Promise<void> {
  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Authorization code is required' });
      return;
    }

    const result = await googleAuth(code);
    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    res.redirect(config.clientUrl);
  } catch (error) {
    logger.error({ err: error }, 'Google OAuth callback failed');
    res.redirect(`${config.clientUrl}/login?error=oauth_failed`);
  }
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token is required', code: 'NO_REFRESH_TOKEN' });
      return;
    }

    const result = await refreshTokens(refreshToken);
    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

    res.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        subscription: result.user.subscription,
      },
    });
  } catch (error) {
    handleAuthError(res, error);
  }
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  try {
    const accessToken = req.cookies?.access_token;
    if (accessToken) await logoutUseCase(accessToken);
    clearAuthCookies(res);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Logout error');
    clearAuthCookies(res);
    res.json({ message: 'Logged out successfully' });
  }
}

export async function getMeHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const dbUser = await userRepository.findById(userId);
    if (!dbUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        subscription: dbUser.subscription,
        phone: dbUser.phone,
        avatar: dbUser.avatar,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Get me error');
    res.status(500).json({ error: 'Internal server error' });
  }
}

function handleAuthError(res: Response, error: unknown): void {
  if (error instanceof DomainError) {
    const statusMap: Record<string, number> = {
      EMAIL_EXISTS: 409,
      INVALID_CREDENTIALS: 401,
      OAUTH_ACCOUNT: 400,
      INVALID_REFRESH_TOKEN: 401,
      REFRESH_TOKEN_REVOKED: 401,
      USER_NOT_FOUND: 404,
    };
    res.status(statusMap[error.code] ?? 400).json({ error: error.message, code: error.code });
    return;
  }

  logger.error({ err: error }, 'Unexpected auth error');
  res.status(500).json({ error: 'Internal server error' });
}
