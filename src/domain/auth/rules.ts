import { DomainError } from '@domain/shared/errors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();

  if (!trimmed) {
    throw new DomainError('Email is required', 'EMAIL_REQUIRED');
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    throw new DomainError('Invalid email format', 'EMAIL_INVALID');
  }
  if (trimmed.length > 255) {
    throw new DomainError('Email must be at most 255 characters', 'EMAIL_TOO_LONG');
  }

  return trimmed;
}

export function validatePassword(password: string): string {
  if (!password) {
    throw new DomainError('Password is required', 'PASSWORD_REQUIRED');
  }
  if (password.length < 8) {
    throw new DomainError('Password must be at least 8 characters', 'PASSWORD_TOO_SHORT');
  }
  if (password.length > 128) {
    throw new DomainError('Password must be at most 128 characters', 'PASSWORD_TOO_LONG');
  }
  if (!/[A-Z]/.test(password)) {
    throw new DomainError(
      'Password must contain at least one uppercase letter',
      'PASSWORD_NO_UPPERCASE',
    );
  }
  if (!/[0-9]/.test(password)) {
    throw new DomainError('Password must contain at least one number', 'PASSWORD_NO_NUMBER');
  }

  return password;
}
