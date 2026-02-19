import { DomainError } from '../shared/errors.js';
import type { Result } from '../shared/types.js';
import { err, ok } from '../shared/types.js';

export function validateName(name: string): Result<string, DomainError> {
  const trimmed = name.trim();

  if (!trimmed) {
    return err(new DomainError('Name is required', 'NAME_REQUIRED'));
  }
  if (trimmed.length < 2) {
    return err(new DomainError('Name must be at least 2 characters', 'NAME_TOO_SHORT'));
  }
  if (trimmed.length > 100) {
    return err(new DomainError('Name must be at most 100 characters', 'NAME_TOO_LONG'));
  }

  return ok(trimmed);
}
