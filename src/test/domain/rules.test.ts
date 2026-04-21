import { validateEmail, validatePassword } from '@domain/auth/rules';
import { validateName } from '@domain/user/rules';
import { DomainError } from '@domain/shared/errors';
import { describe, expect, it } from 'vitest';

describe('validateEmail', () => {
  it('should accept valid email', () => {
    const result = validateEmail('test@example.com');
    expect(result).toBe('test@example.com');
  });

  it('should trim and lowercase email', () => {
    const result = validateEmail('  Test@Example.COM  ');
    expect(result).toBe('test@example.com');
  });

  it('should reject empty email', () => {
    expect(() => validateEmail('')).toThrow(DomainError);
    try {
      validateEmail('');
    } catch (error) {
      if (error instanceof DomainError) {
        expect(error.code).toBe('EMAIL_REQUIRED');
      }
    }
  });

  it('should reject invalid format', () => {
    expect(() => validateEmail('not-an-email')).toThrow(DomainError);
    try {
      validateEmail('not-an-email');
    } catch (error) {
      if (error instanceof DomainError) {
        expect(error.code).toBe('EMAIL_INVALID');
      }
    }
  });

  it('should reject email over 255 chars', () => {
    const long = `${'a'.repeat(250)}@b.com`;
    expect(() => validateEmail(long)).toThrow(DomainError);
    try {
      validateEmail(long);
    } catch (error) {
      if (error instanceof DomainError) {
        expect(error.code).toBe('EMAIL_TOO_LONG');
      }
    }
  });
});

describe('validatePassword', () => {
  it('should accept valid password', () => {
    const result = validatePassword('Test1234');
    expect(result).toBe('Test1234');
  });

  it('should reject empty password', () => {
    expect(() => validatePassword('')).toThrow(DomainError);
    try {
      validatePassword('');
    } catch (error) {
      if (error instanceof DomainError) {
        expect(error.code).toBe('PASSWORD_REQUIRED');
      }
    }
  });

  it('should reject password under 8 chars', () => {
    expect(() => validatePassword('Te1')).toThrow(DomainError);
    try {
      validatePassword('Te1');
    } catch (error) {
      if (error instanceof DomainError) {
        expect(error.code).toBe('PASSWORD_TOO_SHORT');
      }
    }
  });

  it('should reject password over 128 chars', () => {
    expect(() => validatePassword(`A1${'a'.repeat(127)}`)).toThrow(DomainError);
    try {
      validatePassword(`A1${'a'.repeat(127)}`);
    } catch (error) {
      if (error instanceof DomainError) {
        expect(error.code).toBe('PASSWORD_TOO_LONG');
      }
    }
  });

  it('should reject password without uppercase', () => {
    expect(() => validatePassword('test1234')).toThrow(DomainError);
    try {
      validatePassword('test1234');
    } catch (error) {
      if (error instanceof DomainError) {
        expect(error.code).toBe('PASSWORD_NO_UPPERCASE');
      }
    }
  });

  it('should reject password without number', () => {
    expect(() => validatePassword('Testtest')).toThrow(DomainError);
    try {
      validatePassword('Testtest');
    } catch (error) {
      if (error instanceof DomainError) {
        expect(error.code).toBe('PASSWORD_NO_NUMBER');
      }
    }
  });
});

describe('validateName', () => {
  it('should accept valid name', () => {
    const result = validateName('John Doe');
    expect(result).toBe('John Doe');
  });

  it('should trim name', () => {
    const result = validateName('  John  ');
    expect(result).toBe('John');
  });

  it('should reject empty name', () => {
    expect(() => validateName('')).toThrow(DomainError);
    try {
      validateName('');
    } catch (error) {
      if (error instanceof DomainError) {
        expect(error.code).toBe('NAME_REQUIRED');
      }
    }
  });

  it('should reject name under 2 chars', () => {
    expect(() => validateName('A')).toThrow(DomainError);
    try {
      validateName('A');
    } catch (error) {
      if (error instanceof DomainError) {
        expect(error.code).toBe('NAME_TOO_SHORT');
      }
    }
  });

  it('should reject name over 100 chars', () => {
    expect(() => validateName('A'.repeat(101))).toThrow(DomainError);
    try {
      validateName('A'.repeat(101));
    } catch (error) {
      if (error instanceof DomainError) {
        expect(error.code).toBe('NAME_TOO_LONG');
      }
    }
  });
});
