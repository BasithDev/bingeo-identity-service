import type { IAuthCredential } from '@domain/auth/entities';
import type { IUserProfile } from '@domain/user/entities';

export const USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
export const AUTH_ID = 'c9bf9e57-1685-4c89-bafb-ff5af830be8a';

export function createMockUser(overrides: Partial<IUserProfile> = {}): IUserProfile {
  return {
    id: USER_ID,
    email: 'test@example.com',
    name: 'Test',
    role: 'user',
    subscription: 'free',
    emailVerified: true,
    phone: null,
    avatar: null,
    isBlocked: false,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function createMockAuthRecord(
  overrides: Partial<IAuthCredential> = {},
): IAuthCredential {
  return {
    id: AUTH_ID,
    userId: USER_ID,
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    provider: 'local',
    providerId: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function createMockTokens(
  overrides: { accessToken?: string; refreshToken?: string } = {},
) {
  return {
    accessToken: overrides.accessToken ?? 'mock-access',
    refreshToken: overrides.refreshToken ?? 'mock-refresh',
  };
}
