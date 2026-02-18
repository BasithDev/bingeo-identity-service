import type { JwtAccessPayload } from '@domain/auth/dtos.js';
import type { IJwtService, ITokenStore } from '@domain/auth/ports.js';
import type { NextFunction, Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.enum.js';

declare global {
  namespace Express {
    interface Request {
      user?: JwtAccessPayload;
    }
  }
}

export function createRequireAuth(jwtService: IJwtService, tokenStore: ITokenStore) {
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
      const payload = jwtService.verifyAccessToken(token);

      const isBlacklisted = await tokenStore.isAccessTokenBlacklisted(payload.jti);
      if (isBlacklisted) {
        res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ error: 'Token has been revoked', code: 'TOKEN_REVOKED' });
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
