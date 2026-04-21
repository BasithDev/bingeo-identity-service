import crypto from 'node:crypto';
import type {
  IAuthTokens,
  IJwtAccessPayload,
  IJwtRefreshPayload,
} from '@domain/auth/types';
import type { ITokenService } from '@domain/auth/ports';
import type { IUserProfile } from '@domain/user/entities';
import jwt, { type SignOptions } from 'jsonwebtoken';

export class JwtTokenProvider implements ITokenService {
  constructor(
    private readonly secret: string,
    private readonly accessExpiresIn: string,
    private readonly refreshExpiresIn: string,
  ) {}

  signAccessToken(user: IUserProfile): string {
    const payload: Omit<IJwtAccessPayload, 'jti'> = {
      typ: 'access',
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      subscription: user.subscription,
    };

    const options: SignOptions = {
      expiresIn: this.accessExpiresIn as SignOptions['expiresIn'],
    };

    return jwt.sign({ ...payload, jti: crypto.randomUUID() }, this.secret, options);
  }

  signRefreshToken(userId: string): string {
    const options: SignOptions = {
      expiresIn: this.refreshExpiresIn as SignOptions['expiresIn'],
    };

    return jwt.sign(
      { typ: 'refresh', sub: userId, jti: crypto.randomUUID() },
      this.secret,
      options,
    );
  }

  verifyAccessToken(token: string): IJwtAccessPayload {
    return jwt.verify(token, this.secret) as IJwtAccessPayload;
  }

  verifyRefreshToken(token: string): IJwtRefreshPayload {
    return jwt.verify(token, this.secret) as IJwtRefreshPayload;
  }

  generateTokenPair(user: IUserProfile): IAuthTokens {
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
