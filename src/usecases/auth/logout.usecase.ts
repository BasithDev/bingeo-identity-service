import type { ITokenService, ITokenStore } from '@domain/auth/ports.js';

export class LogoutUseCase {
  constructor(
    private readonly tokenStore: ITokenStore,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(accessToken: string, refreshToken?: string): Promise<void> {
    // Blacklist the access token so it cannot be reused
    try {
      const accessPayload = this.tokenService.verifyAccessToken(accessToken);
      const remaining = this.tokenService.getRemainingSeconds(accessToken);
      if (remaining > 0) {
        await this.tokenStore.blacklistAccessToken(accessPayload.jti, remaining);
      }
    } catch {
      // expired/invalid — still try to blacklist refresh token below
    }

    // Blacklist the refresh token by its jti so it cannot be reused
    if (refreshToken) {
      try {
        const refreshPayload = this.tokenService.verifyRefreshToken(refreshToken);
        const remaining = this.tokenService.getRemainingSeconds(refreshToken);
        if (remaining > 0) {
          await this.tokenStore.blacklistRefreshToken(refreshPayload.jti, remaining);
        }
      } catch {
        // expired/invalid — nothing to blacklist
      }
    }
  }
}
