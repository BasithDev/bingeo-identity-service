import type { AuthTokens, RegisterInput } from '@domain/auth/dtos.js';
import type {
  IAuthRepository,
  IJwtService,
  IPasswordHasher,
  ITokenStore,
} from '@domain/auth/ports.js';
import { validateEmail, validatePassword } from '@domain/auth/rules.js';
import { DomainError } from '@domain/shared/errors.js';
import type { UserProfile } from '@domain/user/entities.js';
import type { IUserRepository } from '@domain/user/ports.js';
import { validateName } from '@domain/user/rules.js';

interface RegisterResult {
  user: UserProfile;
  tokens: AuthTokens;
}

export class RegisterUseCase {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly userRepo: IUserRepository,
    private readonly tokenStore: ITokenStore,
    private readonly jwtService: IJwtService,
    private readonly hasher: IPasswordHasher,
  ) {}

  async execute(input: RegisterInput): Promise<RegisterResult> {
    const emailResult = validateEmail(input.email);
    if (!emailResult.ok) throw emailResult.error;

    const passwordResult = validatePassword(input.password);
    if (!passwordResult.ok) throw passwordResult.error;

    const nameResult = validateName(input.name);
    if (!nameResult.ok) throw nameResult.error;

    const existing = await this.authRepo.findByEmail(emailResult.value);
    if (existing) {
      throw new DomainError('Email already registered', 'EMAIL_EXISTS');
    }

    const user = await this.userRepo.create({
      email: emailResult.value,
      name: nameResult.value,
      role: 'user',
      subscription: 'free',
    });

    const passwordHash = await this.hasher.hash(input.password);
    await this.authRepo.create({
      userId: user.id,
      email: emailResult.value,
      passwordHash,
      provider: 'local',
    });

    const tokens = this.jwtService.generateTokenPair(user);
    await this.tokenStore.storeRefreshToken(
      user.id,
      tokens.refreshToken,
      this.jwtService.getRefreshTtlSeconds(),
    );

    return { user, tokens };
  }
}
