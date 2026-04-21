import { DomainError } from '@domain/shared/errors';
import { globalErrorHandler } from '@interfaces/http/middleware/error.middleware';
import type { NextFunction, Request } from 'express';
import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import { createMockRes } from '../../fixtures/http';

vi.mock('../../../shared/logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const req = {} as Request;
const next = vi.fn() as unknown as NextFunction;

describe('globalErrorHandler', () => {
  it('should handle ZodError with 400 VALIDATION_ERROR', () => {
    const { error: err } = z
      .object({ name: z.string().min(1, 'Name is required') })
      .safeParse({ name: '' });
    const res = createMockRes();

    globalErrorHandler(err!, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'VALIDATION_ERROR', error: 'Name is required' }),
    );
  });

  it('should map known DomainError codes to correct status', () => {
    const cases: Array<[string, number]> = [
      ['EMAIL_EXISTS', 409],
      ['INVALID_CREDENTIALS', 401],
      ['USER_NOT_FOUND', 404],
      ['EMAIL_NOT_VERIFIED', 403],
      ['OTP_MAX_ATTEMPTS', 429],
      ['ALREADY_VERIFIED', 409],
      ['GOOGLE_AUTH_FAILED', 400],
    ];

    for (const [code, expectedStatus] of cases) {
      const res = createMockRes();
      globalErrorHandler(new DomainError('message', code), req, res, next);
      expect(res.status).toHaveBeenCalledWith(expectedStatus);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code }));
    }
  });

  it('should use 400 for unknown DomainError codes', () => {
    const res = createMockRes();
    globalErrorHandler(new DomainError('Oops', 'SOME_UNKNOWN_CODE'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should handle generic errors with 500', () => {
    const res = createMockRes();
    globalErrorHandler(new Error('Something exploded'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Internal server error' }),
    );
  });

  it('should handle non-Error values with 500', () => {
    const res = createMockRes();
    globalErrorHandler('string error', req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
