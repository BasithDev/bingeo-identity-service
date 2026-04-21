import type { AuthTokens } from '@domain/auth/dtos.js';
import type { ITokenService, ITokenStore } from '@domain/auth/ports.js';
import { DomainError } from '@domain/shared/errors.js';
import type { UserProfile } from '@domain/user/entities.js';
import type { IUserRepository } from '@domain/user/ports.js';

interface RefreshResult {
  user: UserProfile;
  tokens: AuthTokens;
}

export class RefreshUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenStore: ITokenStore,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(refreshToken: string): Promise<RefreshResult> {
    // 1. Verify JWT signature and expiry
    let payload: { sub: string; jti: string };
    try {
      payload = this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new DomainError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    // 2. Check if this specific token (by jti) has been blacklisted (e.g. after logout)
    const isBlacklisted = await this.tokenStore.isRefreshTokenBlacklisted(payload.jti);
    if (isBlacklisted) {
      throw new DomainError('Refresh token has been revoked', 'REFRESH_TOKEN_REVOKED');
    }

    // 3. Load the user
    const user = await this.userRepo.findById(payload.sub);
    if (!user) {
      throw new DomainError('User not found', 'USER_NOT_FOUND');
    }

    // 4. Issue a new access token only; reuse the same refresh token (it's long-lived)
    const accessToken = this.tokenService.signAccessToken(user);

    return { user, tokens: { accessToken, refreshToken } };
  }
}
