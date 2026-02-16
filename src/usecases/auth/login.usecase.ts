import argon2 from 'argon2';
import { tokenStore } from '../../adapters/cache/token.store.js';
import { authRepository } from '../../adapters/db/auth.repository.js';
import { userRepository } from '../../adapters/db/user.repository.js';
import type { AuthTokens, LoginInput } from '../../domain/auth/types.js';
import { DomainError } from '../../domain/shared/errors.js';
import type { UserProfile } from '../../domain/user/entities.js';
import { generateTokenPair, getRefreshTtlSeconds } from './jwt.service.js';

interface LoginResult {
  user: UserProfile;
  tokens: AuthTokens;
}

export async function login(input: LoginInput): Promise<LoginResult> {
  // Find auth record by email
  const authRecord = await authRepository.findByEmail(input.email.trim().toLowerCase());
  if (!authRecord) {
    throw new DomainError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (!authRecord.passwordHash) {
    throw new DomainError(
      'This account uses Google sign-in. Please log in with Google.',
      'OAUTH_ACCOUNT',
    );
  }

  const isValid = await argon2.verify(authRecord.passwordHash, input.password);
  if (!isValid) {
    throw new DomainError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // Get user profile
  const dbUser = await userRepository.findById(authRecord.userId);
  if (!dbUser) {
    throw new DomainError('User profile not found', 'USER_NOT_FOUND');
  }

  const user: UserProfile = {
    ...dbUser,
    role: dbUser.role as 'user' | 'admin',
    subscription: dbUser.subscription as 'free' | 'premium',
  };

  const tokens = generateTokenPair(user);
  await tokenStore.storeRefreshToken(user.id, tokens.refreshToken, getRefreshTtlSeconds());

  return { user, tokens };
}
