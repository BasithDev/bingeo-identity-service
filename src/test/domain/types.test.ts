import { err, ok } from '@domain/shared/types.js';
import { describe, expect, it } from 'vitest';

describe('Result type', () => {
  it('should create ok result', () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  it('should create err result', () => {
    const result = err(new Error('test error'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('test error');
    }
  });
});
