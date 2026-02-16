import { createClient } from 'redis';
import { config } from '../../config/env.js';
import { logger } from '../../logger.js';

export const redisClient = createClient({
  url: config.redisUrl,
});

redisClient.on('error', (error) => {
  logger.error({ err: error }, 'Redis client error');
});

redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

export async function connectRedis(): Promise<void> {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
}
