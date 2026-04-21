import 'dotenv/config';
import './shared/instrumentation';

import type { IncomingMessage, ServerResponse } from 'node:http';
import { connectRedis, disconnectRedis } from '@adapters/cache/redis.client';
import { pool } from '@adapters/db/client/db.client';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import pinoHttp from 'pino-http';
import { apiRouter } from './bootstrap';
import { globalErrorHandler } from './interfaces/http/middleware/error.middleware';
import { logger } from './shared/logger';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }),
);

app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req: IncomingMessage) => req.url === '/health',
    },
    customLogLevel: (_req: IncomingMessage, res: ServerResponse) => {
      if (res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    serializers: {
      req: (req: Record<string, unknown>) => ({
        method: req.method,
        url: req.url,
      }),
      res: (res: Record<string, unknown>) => ({
        status: res.statusCode,
      }),
    },
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'identity-service' });
});

app.use('/api', apiRouter);

app.use((req, res) => {
  logger.warn({ method: req.method, path: req.path }, 'Route not found');
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

app.use(globalErrorHandler);

async function start(): Promise<void> {
  try {
    await connectRedis();
    logger.info('Redis connected');

    const client = await pool.connect();
    client.release();
    logger.info('PostgreSQL connected');

    app.listen(PORT, () => {
      logger.info(`🚀 Identity Service started on port ${PORT}`);
    });
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start Identity Service');
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down gracefully...');

  try {
    await disconnectRedis();
    await pool.end();
    logger.info('All connections closed');
  } catch (error) {
    logger.error({ err: error }, 'Error during shutdown');
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
