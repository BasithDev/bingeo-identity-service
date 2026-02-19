import crypto from 'node:crypto';
import type { AuthTokens, JwtAccessPayload, JwtRefreshPayload } from '@domain/auth/dtos.js';
import type { IJwtService } from '@domain/auth/ports.js';
import type { UserProfile } from '@domain/user/entities.js';
import jwt, { type SignOptions } from 'jsonwebtoken';

export class JwtService implements IJwtService {
  constructor(
    private readonly secret: string,
    private readonly accessExpiresIn: string,
    private readonly refreshExpiresIn: string,
  ) {}

  signAccessToken(user: UserProfile): string {
    const payload: Omit<JwtAccessPayload, 'jti'> = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'user' | 'admin',
      subscription: user.subscription as 'free' | 'premium',
    };

    const options: SignOptions = {
      expiresIn: this.accessExpiresIn as unknown as SignOptions['expiresIn'],
    };

    return jwt.sign({ ...payload, jti: crypto.randomUUID() }, this.secret, options);
  }

  signRefreshToken(userId: string): string {
    const options: SignOptions = {
      expiresIn: this.refreshExpiresIn as unknown as SignOptions['expiresIn'],
    };

    return jwt.sign({ sub: userId, jti: crypto.randomUUID() }, this.secret, options);
  }

  verifyAccessToken(token: string): JwtAccessPayload {
    return jwt.verify(token, this.secret) as JwtAccessPayload;
  }

  verifyRefreshToken(token: string): JwtRefreshPayload {
    return jwt.verify(token, this.secret) as JwtRefreshPayload;
  }

  generateTokenPair(user: UserProfile): AuthTokens {
    return {
      accessToken: this.signAccessToken(user),
      refreshToken: this.signRefreshToken(user.id),
    };
  }

  getRefreshTtlSeconds(): number {
    const raw = this.refreshExpiresIn;
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

  getRemainingSeconds(token: string): number {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (!decoded?.exp) return 0;
    const remaining = decoded.exp - Math.floor(Date.now() / 1000);
    return Math.max(remaining, 0);
  }
}
