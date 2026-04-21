import { DomainError } from '@domain/shared/errors';

export function validateName(name: string): string {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new DomainError('Name is required', 'NAME_REQUIRED');
  }
  if (trimmed.length < 2) {
    throw new DomainError('Name must be at least 2 characters', 'NAME_TOO_SHORT');
  }
  if (trimmed.length > 100) {
    throw new DomainError('Name must be at most 100 characters', 'NAME_TOO_LONG');
  }

  return trimmed;
}
