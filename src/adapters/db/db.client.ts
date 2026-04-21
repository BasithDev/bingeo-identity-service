import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../../config/env.js';
import { logger } from '../../logger.js';
import * as schema from './schema.js';

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
