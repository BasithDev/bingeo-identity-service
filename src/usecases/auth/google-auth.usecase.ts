import type { AuthTokens } from '@domain/auth/dtos.js';
import type {
  IAuthRepository,
  IGoogleOAuthClient,
  IJwtService,
  ITokenStore,
} from '@domain/auth/ports.js';
import type { UserProfile } from '@domain/user/entities.js';
import type { IUserRepository } from '@domain/user/ports.js';

interface GoogleAuthResult {
  user: UserProfile;
  tokens: AuthTokens;
  isNewUser: boolean;
}

export class GoogleAuthUseCase {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly userRepo: IUserRepository,
    private readonly tokenStore: ITokenStore,
    private readonly jwtService: IJwtService,
    private readonly googleOAuth: IGoogleOAuthClient,
  ) {}

  async execute(code: string): Promise<GoogleAuthResult> {
    const googleUser = await this.googleOAuth.exchangeCode(code);

    const authRecord = await this.authRepo.findByProvider('google', googleUser.googleId);
    let isNewUser = false;
    let user: UserProfile | null = null;

    if (authRecord) {
      user = await this.userRepo.findById(authRecord.userId);
      if (!user) throw new Error('User profile missing for existing auth record');
    } else {
      const existingUser = await this.userRepo.findByEmail(googleUser.email);

      if (existingUser) {
        user = existingUser;
        await this.authRepo.create({
          userId: user.id,
          email: googleUser.email,
          provider: 'google',
          providerId: googleUser.googleId,
        });
      } else {
        user = await this.userRepo.create({
          email: googleUser.email,
          name: googleUser.name,
          role: 'user',
          subscription: 'free',
        });

        await this.authRepo.create({
          userId: user.id,
          email: googleUser.email,
          provider: 'google',
          providerId: googleUser.googleId,
        });

        isNewUser = true;
      }
    }

    if (!user) throw new Error('Failed to resolve user profile');

    const tokens = this.jwtService.generateTokenPair(user);
    await this.tokenStore.storeRefreshToken(
      user.id,
      tokens.refreshToken,
      this.jwtService.getRefreshTtlSeconds(),
    );

    return { user, tokens, isNewUser };
  }
}
