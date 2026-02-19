import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

// Auth credentials — login-related data only
export const auth = pgTable(
  'auth',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).unique().notNull(),
    passwordHash: varchar('password_hash', { length: 255 }),
    provider: varchar('provider', { length: 20 }).notNull().default('local'),
    providerId: varchar('provider_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_auth_email').on(table.email),
    index('idx_auth_user_id').on(table.userId),
    index('idx_auth_provider').on(table.provider, table.providerId),
  ],
);

// User profile — identity & profile data
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  role: varchar('role', { length: 20 }).notNull().default('user'),
  subscription: varchar('subscription', { length: 20 }).notNull().default('free'),
  phone: varchar('phone', { length: 20 }),
  avatar: text('avatar'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
