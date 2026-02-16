import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env.js', () => ({
  config: {
    jwtSecret: 'test-secret-key-for-unit-tests',
    jwtAccessExpiresIn: '15m',
    jwtRefreshExpiresIn: '7d',
  },
}));

import type { UserProfile } from '../../domain/user/entities.js';
import {
  generateTokenPair,
  getRefreshTtlSeconds,
  getRemainingSeconds,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../usecases/auth/jwt.service.js';

const mockUser: UserProfile = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  subscription: 'free',
  phone: null,
  avatar: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('jwt.service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('signAccessToken / verifyAccessToken', () => {
    it('should sign and verify an access token', () => {
      const token = signAccessToken(mockUser);
      expect(typeof token).toBe('string');

      const payload = verifyAccessToken(token);
      expect(payload.sub).toBe('user-123');
      expect(payload.email).toBe('test@example.com');
      expect(payload.name).toBe('Test User');
      expect(payload.role).toBe('user');
      expect(payload.jti).toBeDefined();
    });

    it('should throw on invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow();
    });
  });

  describe('signRefreshToken / verifyRefreshToken', () => {
    it('should sign and verify a refresh token', () => {
      const token = signRefreshToken('user-123');
      const payload = verifyRefreshToken(token);
      expect(payload.sub).toBe('user-123');
      expect(payload.jti).toBeDefined();
    });

    it('should throw on invalid token', () => {
      expect(() => verifyRefreshToken('bad-token')).toThrow();
    });
  });

  describe('generateTokenPair', () => {
    it('should return access and refresh tokens', () => {
      const pair = generateTokenPair(mockUser);
      expect(pair.accessToken).toBeDefined();
      expect(pair.refreshToken).toBeDefined();

      const access = verifyAccessToken(pair.accessToken);
      expect(access.sub).toBe('user-123');

      const refresh = verifyRefreshToken(pair.refreshToken);
      expect(refresh.sub).toBe('user-123');
    });
  });

  describe('getRefreshTtlSeconds', () => {
    it('should parse 7d correctly', () => {
      expect(getRefreshTtlSeconds()).toBe(7 * 24 * 60 * 60);
    });
  });

  describe('getRemainingSeconds', () => {
    it('should return remaining seconds for a valid token', () => {
      const token = signAccessToken(mockUser);
      const remaining = getRemainingSeconds(token);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(15 * 60);
    });

    it('should return 0 for invalid token', () => {
      expect(getRemainingSeconds('garbage')).toBe(0);
    });
  });
});
