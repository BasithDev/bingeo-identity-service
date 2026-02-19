import type { UserProfile } from '@domain/user/entities.js';
import { JwtService } from '@usecases/auth/jwt.service.js';
import { describe, expect, it } from 'vitest';

const jwtService = new JwtService('test-secret-key-for-unit-tests', '15m', '7d');

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

describe('JwtService', () => {
  describe('signAccessToken / verifyAccessToken', () => {
    it('should sign and verify an access token', () => {
      const token = jwtService.signAccessToken(mockUser);
      expect(typeof token).toBe('string');

      const payload = jwtService.verifyAccessToken(token);
      expect(payload.sub).toBe('user-123');
      expect(payload.email).toBe('test@example.com');
      expect(payload.name).toBe('Test User');
      expect(payload.role).toBe('user');
      expect(payload.jti).toBeDefined();
    });

    it('should throw on invalid token', () => {
      expect(() => jwtService.verifyAccessToken('invalid-token')).toThrow();
    });
  });

  describe('signRefreshToken / verifyRefreshToken', () => {
    it('should sign and verify a refresh token', () => {
      const token = jwtService.signRefreshToken('user-123');
      const payload = jwtService.verifyRefreshToken(token);
      expect(payload.sub).toBe('user-123');
      expect(payload.jti).toBeDefined();
    });

    it('should throw on invalid token', () => {
      expect(() => jwtService.verifyRefreshToken('bad-token')).toThrow();
    });
  });

  describe('generateTokenPair', () => {
    it('should return access and refresh tokens', () => {
      const pair = jwtService.generateTokenPair(mockUser);
      expect(pair.accessToken).toBeDefined();
      expect(pair.refreshToken).toBeDefined();

      const access = jwtService.verifyAccessToken(pair.accessToken);
      expect(access.sub).toBe('user-123');

      const refresh = jwtService.verifyRefreshToken(pair.refreshToken);
      expect(refresh.sub).toBe('user-123');
    });
  });

  describe('getRefreshTtlSeconds', () => {
    it('should parse 7d correctly', () => {
      expect(jwtService.getRefreshTtlSeconds()).toBe(7 * 24 * 60 * 60);
    });
  });

  describe('getRemainingSeconds', () => {
    it('should return remaining seconds for a valid token', () => {
      const token = jwtService.signAccessToken(mockUser);
      const remaining = jwtService.getRemainingSeconds(token);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(15 * 60);
    });

    it('should return 0 for invalid token', () => {
      expect(jwtService.getRemainingSeconds('garbage')).toBe(0);
    });
  });
});
