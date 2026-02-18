import type { AuthTokens } from '@domain/auth/dtos.js';
import type { IJwtService, ITokenStore } from '@domain/auth/ports.js';
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
    private readonly jwtService: IJwtService,
  ) {}

  async execute(refreshToken: string): Promise<RefreshResult> {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verifyRefreshToken(refreshToken);
    } catch {
      throw new DomainError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    const storedToken = await this.tokenStore.getRefreshToken(payload.sub);
    if (!storedToken || storedToken !== refreshToken) {
      await this.tokenStore.deleteAllRefreshTokens(payload.sub);
      throw new DomainError('Refresh token has been revoked', 'REFRESH_TOKEN_REVOKED');
    }

    const user = await this.userRepo.findById(payload.sub);
    if (!user) {
      await this.tokenStore.deleteAllRefreshTokens(payload.sub);
      throw new DomainError('User not found', 'USER_NOT_FOUND');
    }

    const tokens = this.jwtService.generateTokenPair(user);
    await this.tokenStore.storeRefreshToken(
      user.id,
      tokens.refreshToken,
      this.jwtService.getRefreshTtlSeconds(),
    );

    return { user, tokens };
  }
}
