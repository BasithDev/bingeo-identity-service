import { eq } from 'drizzle-orm';
import { db } from './db.client.js';
import { users } from './schema.js';

export type NewUser = typeof users.$inferInsert;
export type DbUser = typeof users.$inferSelect;

export const userRepository = {
  async findById(id: string): Promise<DbUser | null> {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  },

  async findByEmail(email: string): Promise<DbUser | null> {
    const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return row ?? null;
  },

  async create(data: NewUser): Promise<DbUser> {
    const [row] = await db.insert(users).values(data).returning();
    return row;
  },

  async updateSubscription(id: string, subscription: string): Promise<DbUser | null> {
    const [row] = await db
      .update(users)
      .set({ subscription, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return row ?? null;
  },

  async updateProfile(
    id: string,
    data: Partial<Pick<DbUser, 'name' | 'phone' | 'avatar'>>,
  ): Promise<DbUser | null> {
    const [row] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return row ?? null;
  },
};
