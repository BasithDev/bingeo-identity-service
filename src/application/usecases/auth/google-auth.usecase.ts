import type { IAuthTokens } from '@application/dtos/auth.dtos';
import type { IAuthRepository, IGoogleOAuthClient, ITokenService } from '@domain/auth/ports';
import { DomainError } from '@domain/shared/errors';
import type { IUserProfile } from '@domain/user/entities';
import type { IUserRepository } from '@domain/user/ports';

interface IGoogleAuthResult {
  user: IUserProfile;
  tokens: IAuthTokens;
  isNewUser: boolean;
}

export interface IGoogleAuthExecutor {
  execute(code: string): Promise<IGoogleAuthResult>;
}

export class GoogleAuthUseCase implements IGoogleAuthExecutor {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly userRepo: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly googleOAuth: IGoogleOAuthClient,
  ) {}

  async execute(code: string): Promise<IGoogleAuthResult> {
    const googleUser = await this.googleOAuth.exchangeCode(code);

    const authRecord = await this.authRepo.findByProvider('google', googleUser.googleId);
    let isNewUser = false;
    let user: IUserProfile | null = null;

    if (authRecord) {
      user = await this.userRepo.findById(authRecord.userId);
      if (!user)
        throw new DomainError(
          'User profile missing for existing auth record',
          'USER_PROFILE_MISSING',
        );
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

        await this.userRepo.verifyEmail(user.id);
        user = (await this.userRepo.findById(user.id)) ?? user;

        await this.authRepo.create({
          userId: user.id,
          email: googleUser.email,
          provider: 'google',
          providerId: googleUser.googleId,
        });

        isNewUser = true;
      }
    }

    if (!user) throw new DomainError('Failed to resolve user profile', 'USER_PROFILE_MISSING');

    const tokens = this.tokenService.generateTokenPair(user);

    return { user, tokens, isNewUser };
  }
}
