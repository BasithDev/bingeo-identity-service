import { and, eq } from 'drizzle-orm';
import { db } from './db.client.js';
import { auth } from './schema.js';

export type NewAuth = typeof auth.$inferInsert;
export type DbAuth = typeof auth.$inferSelect;

export const authRepository = {
  async findByEmail(email: string): Promise<DbAuth | null> {
    const [row] = await db.select().from(auth).where(eq(auth.email, email)).limit(1);
    return row ?? null;
  },

  async findByUserId(userId: string): Promise<DbAuth | null> {
    const [row] = await db.select().from(auth).where(eq(auth.userId, userId)).limit(1);
    return row ?? null;
  },

  async findByProvider(provider: string, providerId: string): Promise<DbAuth | null> {
    const [row] = await db
      .select()
      .from(auth)
      .where(and(eq(auth.provider, provider), eq(auth.providerId, providerId)))
      .limit(1);
    return row ?? null;
  },

  async create(data: NewAuth): Promise<DbAuth> {
    const [row] = await db.insert(auth).values(data).returning();
    return row;
  },
};
