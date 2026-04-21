import type { IJwtAccessPayload } from '@domain/auth/types';
import type { ITokenService, ITokenStore, IUserBlockStore } from '@domain/auth/ports';
import type { NextFunction, Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.enum';

declare global {
  namespace Express {
    interface Request {
      user?: IJwtAccessPayload;
    }
  }
}

export function createRequireAuth(
  tokenService: ITokenService,
  tokenStore: ITokenStore,
  userBlockStore: IUserBlockStore,
) {
  return async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const token = req.cookies?.access_token;

    if (!token) {
      res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ error: 'Authentication required', code: 'NO_TOKEN' });
      return;
    }

    try {
      const payload = tokenService.verifyAccessToken(token);

      if (payload.typ !== 'access') {
        res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ error: 'Invalid token type', code: 'INVALID_TOKEN' });
        return;
      }

      const isBlacklisted = await tokenStore.isAccessTokenBlacklisted(payload.jti);
      if (isBlacklisted) {
        res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ error: 'Token has been revoked', code: 'TOKEN_REVOKED' });
        return;
      }

      const isBlocked = await userBlockStore.isUserBlocked(payload.sub);
      if (isBlocked) {
        res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ error: 'Your account has been suspended', code: 'USER_BLOCKED' });
        return;
      }

      req.user = payload;
      next();
    } catch {
      res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
    }
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(HttpStatus.FORBIDDEN).json({ error: 'Admin access required', code: 'FORBIDDEN' });
    return;
  }
  next();
}
