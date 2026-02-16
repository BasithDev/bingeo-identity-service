import { tokenStore } from '../../adapters/cache/token.store.js';
import { authRepository } from '../../adapters/db/auth.repository.js';
import type { DbUser } from '../../adapters/db/user.repository.js';
import { userRepository } from '../../adapters/db/user.repository.js';
import { exchangeGoogleCode } from '../../adapters/external/google-oauth.client.js';
import type { AuthTokens } from '../../domain/auth/types.js';
import type { UserProfile } from '../../domain/user/entities.js';
import { generateTokenPair, getRefreshTtlSeconds } from './jwt.service.js';

interface GoogleAuthResult {
  user: UserProfile;
  tokens: AuthTokens;
  isNewUser: boolean;
}

export async function googleAuth(code: string): Promise<GoogleAuthResult> {
  const googleUser = await exchangeGoogleCode(code);

  const authRecord = await authRepository.findByProvider('google', googleUser.googleId);
  let isNewUser = false;
  let dbUser: DbUser | null = null;

  if (authRecord) {
    dbUser = await userRepository.findById(authRecord.userId);
    if (!dbUser) throw new Error('User profile missing for existing auth record');
  } else {
    const existingUser = await userRepository.findByEmail(googleUser.email);

    if (existingUser) {
      dbUser = existingUser;
      await authRepository.create({
        userId: dbUser.id,
        email: googleUser.email,
        provider: 'google',
        providerId: googleUser.googleId,
      });
    } else {
      dbUser = await userRepository.create({
        email: googleUser.email,
        name: googleUser.name,
        role: 'user',
        subscription: 'free',
      });

      await authRepository.create({
        userId: dbUser.id,
        email: googleUser.email,
        provider: 'google',
        providerId: googleUser.googleId,
      });

      isNewUser = true;
    }
  }

  if (!dbUser) throw new Error('Failed to resolve user profile');

  const user: UserProfile = {
    ...dbUser,
    role: dbUser.role as 'user' | 'admin',
    subscription: dbUser.subscription as 'free' | 'premium',
  };

  const tokens = generateTokenPair(user);
  await tokenStore.storeRefreshToken(user.id, tokens.refreshToken, getRefreshTtlSeconds());

  return { user, tokens, isNewUser };
}
