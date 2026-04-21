import type { IUserProfile } from '@domain/user/entities';
import type { IFindUsersQuery, IUserListResult, IUserRepository } from '@domain/user/ports';
import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../client/schema';
import { users } from '../client/schema';
import { toUserProfile } from '../mappers/user.mapper';

export class DrizzleUserRepository implements IUserRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async findById(id: string): Promise<IUserProfile | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ? toUserProfile(row) : null;
  }

  async findByEmail(email: string): Promise<IUserProfile | null> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return row ? toUserProfile(row) : null;
  }

  async create(data: {
    email: string;
    name: string;
    role: string;
    subscription: string;
  }): Promise<IUserProfile> {
    const [row] = await this.db.insert(users).values(data).returning();
    return toUserProfile(row);
  }

  async updateSubscription(id: string, subscription: string): Promise<IUserProfile | null> {
    const [row] = await this.db
      .update(users)
      .set({ subscription, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return row ? toUserProfile(row) : null;
  }

  async updateProfile(
    id: string,
    data: Partial<Pick<IUserProfile, 'name' | 'phone' | 'avatar'>>,
  ): Promise<IUserProfile | null> {
    const [row] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return row ? toUserProfile(row) : null;
  }

  async verifyEmail(userId: string): Promise<IUserProfile | null> {
    const [row] = await this.db
      .update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return row ? toUserProfile(row) : null;
  }

  async updateBlockedStatus(userId: string, isBlocked: boolean): Promise<void> {
    await this.db.update(users).set({ isBlocked }).where(eq(users.id, userId));
  }

  async findUsers(query: IFindUsersQuery): Promise<IUserListResult> {
    const { page, pageSize, search, plan, sortBy = 'joinedAt', sortDir = 'desc' } = query;

    const conditions = [eq(users.role, 'user')];
    if (search) {
      conditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.phone, `%${search}%`),
        ) as ReturnType<typeof eq>,
      );
    }
    if (plan) {
      conditions.push(eq(users.subscription, plan));
    }

    const whereClause = and(...conditions);

    const [totalCount] = await this.db.select({ count: count() }).from(users).where(whereClause);

    let orderByColumn: typeof users.createdAt | typeof users.name;
    switch (sortBy) {
      case 'joinedAt':
        orderByColumn = users.createdAt;
        break;
      case 'name':
        orderByColumn = users.name;
        break;
      default:
        orderByColumn = users.createdAt;
        break;
    }

    const direction = sortDir === 'asc' ? asc : desc;

    const rows = await this.db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(direction(orderByColumn))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      data: rows.map(toUserProfile),
      total: Number(totalCount.count),
    };
  }
}
