import type { NextFunction, Request, Response } from 'express';
import { tokenStore } from '../adapters/cache/token.store.js';
import type { JwtAccessPayload } from '../domain/auth/types.js';
import { verifyAccessToken } from '../usecases/auth/jwt.service.js';

declare global {
  namespace Express {
    interface Request {
      user?: JwtAccessPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.access_token;

  if (!token) {
    res.status(401).json({ error: 'Authentication required', code: 'NO_TOKEN' });
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    const isBlacklisted = await tokenStore.isAccessTokenBlacklisted(payload.jti);
    if (isBlacklisted) {
      res.status(401).json({ error: 'Token has been revoked', code: 'TOKEN_REVOKED' });
      return;
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
  }
}
