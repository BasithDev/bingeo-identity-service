/**
 * HTTP Handlers
 * Thin controllers that delegate to usecases
 */

import type { Request, Response } from 'express';

export const healthCheck = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
};

// Add your handlers here
