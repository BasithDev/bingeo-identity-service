// OpenTelemetry MUST be imported first
import './instrumentation.js';

import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './logger.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Request logging middleware - ignore health checks
app.use(pinoHttp({ 
  logger,
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
  customLogLevel: (_req, res) => {
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  // Minimal serializers for cleaner output
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
    }),
    res: (res) => ({
      status: res.statusCode,
    }),
  },
}));

// JSON parsing
app.use(express.json());

// Health check (no logging)
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'identity-service' });
});

// Hello endpoint - for testing the full flow
app.get('/api/identity/hello', (req, res) => {
  logger.info('Hello endpoint called');
  
  res.json({
    message: 'Hello from Bingeo Identity Service! 🚀',
    timestamp: new Date().toISOString(),
    service: 'bingeo-identity-service',
  });
});

// Test endpoint
app.get('/api/identity/test', (req, res) => {
  logger.info({ action: 'test' }, 'Processing test request');
  
  res.json({
    success: true,
    data: {
      timestamp: Date.now(),
      random: Math.random(),
    },
  });
});

// Status endpoint
app.get('/api/identity/status', (_req, res) => {
  res.json({
    service: 'identity-service',
    uptime: process.uptime(),
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn({ path: req.path }, 'Route not found');
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Identity Service started on port ${PORT}`);
});
