import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/adapters/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
    // TLS: only skip cert verification when ALLOW_INSECURE_TLS=true (dev with Aiven self-signed certs)
    ssl: { rejectUnauthorized: process.env.ALLOW_INSECURE_TLS !== 'true' },
  },
});
