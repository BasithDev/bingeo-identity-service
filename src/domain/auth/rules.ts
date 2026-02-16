import { DomainError } from '../shared/errors.js';
import type { Result } from '../shared/types.js';
import { err, ok } from '../shared/types.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): Result<string, DomainError> {
  const trimmed = email.trim().toLowerCase();

  if (!trimmed) {
    return err(new DomainError('Email is required', 'EMAIL_REQUIRED'));
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return err(new DomainError('Invalid email format', 'EMAIL_INVALID'));
  }
  if (trimmed.length > 255) {
    return err(new DomainError('Email must be at most 255 characters', 'EMAIL_TOO_LONG'));
  }

  return ok(trimmed);
}

export function validatePassword(password: string): Result<string, DomainError> {
  if (!password) {
    return err(new DomainError('Password is required', 'PASSWORD_REQUIRED'));
  }
  if (password.length < 8) {
    return err(new DomainError('Password must be at least 8 characters', 'PASSWORD_TOO_SHORT'));
  }
  if (password.length > 128) {
    return err(new DomainError('Password must be at most 128 characters', 'PASSWORD_TOO_LONG'));
  }
  if (!/[A-Z]/.test(password)) {
    return err(
      new DomainError(
        'Password must contain at least one uppercase letter',
        'PASSWORD_NO_UPPERCASE',
      ),
    );
  }
  if (!/[0-9]/.test(password)) {
    return err(new DomainError('Password must contain at least one number', 'PASSWORD_NO_NUMBER'));
  }

  return ok(password);
}
