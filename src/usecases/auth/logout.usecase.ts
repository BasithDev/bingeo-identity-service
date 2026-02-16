import { tokenStore } from '../../adapters/cache/token.store.js';
import { getRemainingSeconds, verifyAccessToken } from './jwt.service.js';

export async function logout(accessToken: string): Promise<void> {
  let payload: { jti: string; sub: string };
  try {
    payload = verifyAccessToken(accessToken);
  } catch {
    return; // Token already expired
  }

  const remaining = getRemainingSeconds(accessToken);
  if (remaining > 0) {
    await tokenStore.blacklistAccessToken(payload.jti, remaining);
  }

  await tokenStore.deleteRefreshToken(payload.sub);
}
