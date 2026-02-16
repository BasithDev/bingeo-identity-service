import { tokenStore } from '../../adapters/cache/token.store.js';
import { userRepository } from '../../adapters/db/user.repository.js';
import type { AuthTokens } from '../../domain/auth/types.js';
import { DomainError } from '../../domain/shared/errors.js';
import type { UserProfile } from '../../domain/user/entities.js';
import { generateTokenPair, getRefreshTtlSeconds, verifyRefreshToken } from './jwt.service.js';

interface RefreshResult {
  user: UserProfile;
  tokens: AuthTokens;
}

export async function refreshTokens(refreshToken: string): Promise<RefreshResult> {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new DomainError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  // Verify token exists in Redis (not revoked)
  const storedToken = await tokenStore.getRefreshToken(payload.sub);
  if (!storedToken || storedToken !== refreshToken) {
    // Possible token theft — revoke all
    await tokenStore.deleteAllRefreshTokens(payload.sub);
    throw new DomainError('Refresh token has been revoked', 'REFRESH_TOKEN_REVOKED');
  }

  const dbUser = await userRepository.findById(payload.sub);
  if (!dbUser) {
    await tokenStore.deleteAllRefreshTokens(payload.sub);
    throw new DomainError('User not found', 'USER_NOT_FOUND');
  }

  const user: UserProfile = {
    ...dbUser,
    role: dbUser.role as 'user' | 'admin',
    subscription: dbUser.subscription as 'free' | 'premium',
  };

  // Rotate tokens
  const tokens = generateTokenPair(user);
  await tokenStore.storeRefreshToken(user.id, tokens.refreshToken, getRefreshTtlSeconds());

  return { user, tokens };
}
