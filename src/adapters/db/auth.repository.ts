import type { AuthCredential } from '@domain/auth/entities.js';
import type { IAuthRepository } from '@domain/auth/ports.js';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema.js';
import { auth } from './schema.js';

type DbAuth = typeof auth.$inferSelect;

function toAuthCredential(row: DbAuth): AuthCredential {
  return {
    id: row.id,
    userId: row.userId,
    email: row.email,
    passwordHash: row.passwordHash,
    provider: row.provider as 'local' | 'google',
    providerId: row.providerId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleAuthRepository implements IAuthRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async findByEmail(email: string): Promise<AuthCredential | null> {
    const [row] = await this.db.select().from(auth).where(eq(auth.email, email)).limit(1);
    return row ? toAuthCredential(row) : null;
  }

  async findByUserId(userId: string): Promise<AuthCredential | null> {
    const [row] = await this.db.select().from(auth).where(eq(auth.userId, userId)).limit(1);
    return row ? toAuthCredential(row) : null;
  }

  async findByProvider(provider: string, providerId: string): Promise<AuthCredential | null> {
    const [row] = await this.db
      .select()
      .from(auth)
      .where(and(eq(auth.provider, provider), eq(auth.providerId, providerId)))
      .limit(1);
    return row ? toAuthCredential(row) : null;
  }

  async create(data: {
    userId: string;
    email: string;
    passwordHash?: string | null;
    provider: string;
    providerId?: string | null;
  }): Promise<AuthCredential> {
    const [row] = await this.db.insert(auth).values(data).returning();
    return toAuthCredential(row);
  }

  async updatePasswordHash(userId: string, newHash: string): Promise<void> {
    await this.db
      .update(auth)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(auth.userId, userId));
  }
}
