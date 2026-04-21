import { config } from '@config/env';
import { logger } from '@shared/logger';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

const connectionUrl = config.databaseUrl.replace(/[?&]sslmode=[^&]*/g, '');

const pool = new pg.Pool({
  connectionString: connectionUrl,
  ssl: { rejectUnauthorized: !config.allowInsecureTls },
});

pool.on('error', (error) => {
  logger.error({ err: error }, 'Unexpected PostgreSQL pool error');
});

export const db = drizzle(pool, { schema });
export { pool };
