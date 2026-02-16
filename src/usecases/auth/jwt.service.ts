import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../../config/env.js';
import type { AuthTokens, JwtAccessPayload, JwtRefreshPayload } from '../../domain/auth/types.js';
import type { UserProfile } from '../../domain/user/entities.js';

export function signAccessToken(user: UserProfile): string {
  const payload: Omit<JwtAccessPayload, 'jti'> = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'user' | 'admin',
    subscription: user.subscription as 'free' | 'premium',
  };

  const options: SignOptions = {
    expiresIn: config.jwtAccessExpiresIn as unknown as SignOptions['expiresIn'],
  };

  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, config.jwtSecret, options);
}

export function signRefreshToken(userId: string): string {
  const options: SignOptions = {
    expiresIn: config.jwtRefreshExpiresIn as unknown as SignOptions['expiresIn'],
  };

  return jwt.sign({ sub: userId, jti: crypto.randomUUID() }, config.jwtSecret, options);
}

export function verifyAccessToken(token: string): JwtAccessPayload {
  return jwt.verify(token, config.jwtSecret) as JwtAccessPayload;
}

export function verifyRefreshToken(token: string): JwtRefreshPayload {
  return jwt.verify(token, config.jwtSecret) as JwtRefreshPayload;
}

export function generateTokenPair(user: UserProfile): AuthTokens {
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user.id),
  };
}

export function getRefreshTtlSeconds(): number {
  const raw = config.jwtRefreshExpiresIn;
  const match = raw.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60;
    case 'h':
      return value * 60 * 60;
    case 'm':
      return value * 60;
    case 's':
      return value;
    default:
      return 7 * 24 * 60 * 60;
  }
}

export function getRemainingSeconds(token: string): number {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) return 0;
  const remaining = decoded.exp - Math.floor(Date.now() / 1000);
  return Math.max(remaining, 0);
}
