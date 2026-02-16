import argon2 from 'argon2';
import { tokenStore } from '../../adapters/cache/token.store.js';
import { authRepository } from '../../adapters/db/auth.repository.js';
import { userRepository } from '../../adapters/db/user.repository.js';
import { validateEmail, validatePassword } from '../../domain/auth/rules.js';
import type { AuthTokens, RegisterInput } from '../../domain/auth/types.js';
import { DomainError } from '../../domain/shared/errors.js';
import type { UserProfile } from '../../domain/user/entities.js';
import { validateName } from '../../domain/user/rules.js';
import { generateTokenPair, getRefreshTtlSeconds } from './jwt.service.js';

interface RegisterResult {
  user: UserProfile;
  tokens: AuthTokens;
}

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const emailResult = validateEmail(input.email);
  if (!emailResult.ok) throw emailResult.error;

  const passwordResult = validatePassword(input.password);
  if (!passwordResult.ok) throw passwordResult.error;

  const nameResult = validateName(input.name);
  if (!nameResult.ok) throw nameResult.error;

  // Check if email already exists in auth table
  const existing = await authRepository.findByEmail(emailResult.value);
  if (existing) {
    throw new DomainError('Email already registered', 'EMAIL_EXISTS');
  }

  // Create user profile first
  const dbUser = await userRepository.create({
    email: emailResult.value,
    name: nameResult.value,
    role: 'user',
    subscription: 'free',
  });

  // Create auth credentials linked to the user
  const passwordHash = await argon2.hash(input.password);
  await authRepository.create({
    userId: dbUser.id,
    email: emailResult.value,
    passwordHash,
    provider: 'local',
  });

  const user: UserProfile = {
    ...dbUser,
    role: dbUser.role as 'user' | 'admin',
    subscription: dbUser.subscription as 'free' | 'premium',
  };

  const tokens = generateTokenPair(user);
  await tokenStore.storeRefreshToken(user.id, tokens.refreshToken, getRefreshTtlSeconds());

  return { user, tokens };
}
