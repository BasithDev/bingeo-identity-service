/**
 * Domain Rules
 * Pure business rule validation functions
 * No side effects, no infrastructure dependencies
 */

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

// Add your domain rules here
