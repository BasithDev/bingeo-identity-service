import { describe, expect, it } from 'vitest';
import { validateEmail, validatePassword } from '../../domain/auth/rules.js';
import { validateName } from '../../domain/user/rules.js';

describe('validateEmail', () => {
  it('should accept valid email', () => {
    const result = validateEmail('test@example.com');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('test@example.com');
  });

  it('should trim and lowercase email', () => {
    const result = validateEmail('  Test@Example.COM  ');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('test@example.com');
  });

  it('should reject empty email', () => {
    const result = validateEmail('');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('EMAIL_REQUIRED');
  });

  it('should reject invalid format', () => {
    const result = validateEmail('not-an-email');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('EMAIL_INVALID');
  });

  it('should reject email over 255 chars', () => {
    const long = `${'a'.repeat(250)}@b.com`;
    const result = validateEmail(long);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('EMAIL_TOO_LONG');
  });
});

describe('validatePassword', () => {
  it('should accept valid password', () => {
    const result = validatePassword('Test1234');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('Test1234');
  });

  it('should reject empty password', () => {
    const result = validatePassword('');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PASSWORD_REQUIRED');
  });

  it('should reject password under 8 chars', () => {
    const result = validatePassword('Te1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PASSWORD_TOO_SHORT');
  });

  it('should reject password over 128 chars', () => {
    const result = validatePassword(`A1${'a'.repeat(127)}`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PASSWORD_TOO_LONG');
  });

  it('should reject password without uppercase', () => {
    const result = validatePassword('test1234');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PASSWORD_NO_UPPERCASE');
  });

  it('should reject password without number', () => {
    const result = validatePassword('Testtest');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PASSWORD_NO_NUMBER');
  });
});

describe('validateName', () => {
  it('should accept valid name', () => {
    const result = validateName('John Doe');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('John Doe');
  });

  it('should trim name', () => {
    const result = validateName('  John  ');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('John');
  });

  it('should reject empty name', () => {
    const result = validateName('');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NAME_REQUIRED');
  });

  it('should reject name under 2 chars', () => {
    const result = validateName('A');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NAME_TOO_SHORT');
  });

  it('should reject name over 100 chars', () => {
    const result = validateName('A'.repeat(101));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NAME_TOO_LONG');
  });
});
