import type { IAuthTokens } from '@application/dtos/auth.dtos';
import type { ITokenService, ITokenStore } from '@domain/auth/ports';
import { DomainError } from '@domain/shared/errors';
import type { IUserProfile } from '@domain/user/entities';
import type { IUserRepository } from '@domain/user/ports';

interface IRefreshResult {
  user: IUserProfile;
  tokens: IAuthTokens;
}

export interface IRefreshExecutor {
  execute(refreshToken: string): Promise<IRefreshResult>;
}

export class RefreshUseCase implements IRefreshExecutor {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenStore: ITokenStore,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(refreshToken: string): Promise<IRefreshResult> {
    let payload: { sub: string; jti: string; typ?: string };
    try {
      payload = this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new DomainError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    if (payload.typ !== 'refresh') {
      throw new DomainError('Invalid token type', 'INVALID_REFRESH_TOKEN');
    }
    const isBlacklisted = await this.tokenStore.isRefreshTokenBlacklisted(payload.jti);
    if (isBlacklisted) {
      throw new DomainError('Refresh token has been revoked', 'REFRESH_TOKEN_REVOKED');
    }

    const user = await this.userRepo.findById(payload.sub);
    if (!user) {
      throw new DomainError('User not found', 'USER_NOT_FOUND');
    }

    const accessToken = this.tokenService.signAccessToken(user);

    return { user, tokens: { accessToken, refreshToken } };
  }
}
