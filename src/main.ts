import 'dotenv/config';
import './instrumentation.js';

import type { IncomingMessage, ServerResponse } from 'node:http';
import cookieParser from 'cookie-parser';
import express from 'express';
import pinoHttp from 'pino-http';
import { connectRedis, disconnectRedis } from './adapters/cache/redis.client.js';
import { pool } from './adapters/db/db.client.js';
import { authRouter } from './http/auth/routes.js';
import { logger } from './logger.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────

// Request logging - ignore health checks
app.use(
  pinoHttp.default({
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

// Body parsing & cookies
app.use(express.json());
app.use(cookieParser());

// ── Routes ──────────────────────────────────────────────

app.use(authRouter);

// 404 handler
app.use((req, res) => {
  logger.warn({ path: req.path }, 'Route not found');
  res.status(404).json({ error: 'Not found' });
});

// ── Server Startup ──────────────────────────────────────

async function start(): Promise<void> {
  try {
    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected');

    // PostgreSQL pool connects lazily on first query —
    // but we verify connectivity here
    const client = await pool.connect();
    client.release();
    logger.info('PostgreSQL connected');

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`🚀 Identity Service started on port ${PORT}`);
    });
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start Identity Service');
    process.exit(1);
  }
}

// ── Graceful Shutdown ───────────────────────────────────

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
