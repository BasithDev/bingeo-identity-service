import { DomainError } from '@domain/shared/errors';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../../../shared/logger';
import { HttpStatus } from '../constants/http-status.enum';

const STATUS_MAP: Record<string, HttpStatus> = {
  EMAIL_EXISTS: HttpStatus.CONFLICT,
  INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
  OAUTH_ACCOUNT: HttpStatus.BAD_REQUEST,
  INVALID_REFRESH_TOKEN: HttpStatus.UNAUTHORIZED,
  REFRESH_TOKEN_REVOKED: HttpStatus.UNAUTHORIZED,
  USER_NOT_FOUND: HttpStatus.NOT_FOUND,
  USER_PROFILE_MISSING: HttpStatus.INTERNAL_SERVER_ERROR,
  EMAIL_NOT_VERIFIED: HttpStatus.FORBIDDEN,
  OTP_INVALID: HttpStatus.BAD_REQUEST,
  OTP_EXPIRED: HttpStatus.BAD_REQUEST,
  OTP_MAX_ATTEMPTS: HttpStatus.RATE_LIMIT,
  ALREADY_VERIFIED: HttpStatus.CONFLICT,
  GOOGLE_AUTH_FAILED: HttpStatus.BAD_REQUEST,
};

export function globalErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    const messages = err.issues.map((issue) => issue.message);
    res
      .status(HttpStatus.BAD_REQUEST)
      .json({ error: messages.join(', '), code: 'VALIDATION_ERROR' });
    return;
  }

  if (err instanceof DomainError) {
    const status = STATUS_MAP[err.code] ?? HttpStatus.BAD_REQUEST;
    res.status(status).json({ error: err.message, code: err.code, ...(err.meta || {}) });
    return;
  }

  logger.error({ err }, 'Unhandled error');
  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
}
