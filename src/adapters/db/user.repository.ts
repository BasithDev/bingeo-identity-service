import { UserMapper } from '@domain/shared/mapper.js';
import type { UserProfile } from '@domain/user/entities.js';
import type { IUserRepository } from '@domain/user/ports.js';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema.js';
import { users } from './schema.js';

export class DrizzleUserRepository implements IUserRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async findById(id: string): Promise<UserProfile | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ? UserMapper.toProfile(row) : null;
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return row ? UserMapper.toProfile(row) : null;
  }

  async create(data: {
    email: string;
    name: string;
    role: string;
    subscription: string;
  }): Promise<UserProfile> {
    const [row] = await this.db.insert(users).values(data).returning();
    return UserMapper.toProfile(row);
  }

  async updateSubscription(id: string, subscription: string): Promise<UserProfile | null> {
    const [row] = await this.db
      .update(users)
      .set({ subscription, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return row ? UserMapper.toProfile(row) : null;
  }

  async updateProfile(
    id: string,
    data: Partial<Pick<UserProfile, 'name' | 'phone' | 'avatar'>>,
  ): Promise<UserProfile | null> {
    const [row] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return row ? UserMapper.toProfile(row) : null;
  }

  async verifyEmail(userId: string): Promise<UserProfile | null> {
    const [row] = await this.db
      .update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return row ? UserMapper.toProfile(row) : null;
  }
}
