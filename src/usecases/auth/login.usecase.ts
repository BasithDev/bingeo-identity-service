import type { AuthTokens, LoginInput } from '@domain/auth/dtos.js';
import type { IAuthRepository, IPasswordHasher, ITokenService } from '@domain/auth/ports.js';
import { DomainError } from '@domain/shared/errors.js';
import type { UserProfile } from '@domain/user/entities.js';
import type { IUserRepository } from '@domain/user/ports.js';

interface LoginResult {
  user: UserProfile;
  tokens: AuthTokens;
}

export class LoginUseCase {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly userRepo: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly hasher: IPasswordHasher,
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const authRecord = await this.authRepo.findByEmail(input.email.trim().toLowerCase());
    if (!authRecord) {
      throw new DomainError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    if (!authRecord.passwordHash) {
      throw new DomainError(
        'This account uses Google sign-in. Please log in with Google.',
        'OAUTH_ACCOUNT',
      );
    }

    const isValid = await this.hasher.verify(authRecord.passwordHash, input.password);
    if (!isValid) {
      throw new DomainError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const user = await this.userRepo.findById(authRecord.userId);
    if (!user) {
      throw new DomainError('User profile not found', 'USER_NOT_FOUND');
    }

    if (!user.emailVerified) {
      throw new DomainError('Email not verified', 'EMAIL_NOT_VERIFIED', { userId: user.id });
    }

    const tokens = this.tokenService.generateTokenPair(user);

    return { user, tokens };
  }
}
