import type { IAuthTokens, ILoginInput } from '@application/dtos/auth.dtos';
import type { IAuthRepository, IPasswordHasher, ITokenService } from '@domain/auth/ports';
import { DomainError } from '@domain/shared/errors';
import type { IUserProfile } from '@domain/user/entities';
import type { IUserRepository } from '@domain/user/ports';

export interface ILoginExecutor {
  execute(input: ILoginInput): Promise<{ user: IUserProfile; tokens: IAuthTokens }>;
}

interface ILoginResult {
  user: IUserProfile;
  tokens: IAuthTokens;
}

export class LoginUseCase implements ILoginExecutor {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly userRepo: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly hasher: IPasswordHasher,
  ) {}

  async execute(input: ILoginInput): Promise<ILoginResult> {
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

    if (user.role === 'user' && !user.emailVerified) {
      throw new DomainError('Email not verified', 'EMAIL_NOT_VERIFIED', { userId: user.id });
    }

    const tokens = this.tokenService.generateTokenPair(user);

    return { user, tokens };
  }
}
