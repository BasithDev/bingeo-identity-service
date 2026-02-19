import type { IJwtService, ITokenStore } from '@domain/auth/ports.js';

export class LogoutUseCase {
  constructor(
    private readonly tokenStore: ITokenStore,
    private readonly jwtService: IJwtService,
  ) {}

  async execute(accessToken: string): Promise<void> {
    let payload: { jti: string; sub: string };
    try {
      payload = this.jwtService.verifyAccessToken(accessToken);
    } catch {
      return;
    }

    const remaining = this.jwtService.getRemainingSeconds(accessToken);
    if (remaining > 0) {
      await this.tokenStore.blacklistAccessToken(payload.jti, remaining);
    }

    await this.tokenStore.deleteRefreshToken(payload.sub);
  }
}
