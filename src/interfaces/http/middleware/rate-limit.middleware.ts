import { rateLimit } from 'express-rate-limit';
import { HttpStatus } from '../constants/http-status.enum';

export const authRateLimiter = rateLimit({
  windowMs: 3 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(HttpStatus.RATE_LIMIT).json({
      error: 'Too many requests, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});
