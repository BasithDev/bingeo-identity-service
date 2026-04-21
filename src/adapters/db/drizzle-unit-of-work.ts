import type { IUnitOfWork } from '@domain/shared/unit-of-work';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './client/schema';

export class DrizzleUnitOfWork implements IUnitOfWork {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async runInTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      return fn(tx);
    });
  }
}
