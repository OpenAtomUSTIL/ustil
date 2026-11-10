import { sql } from 'drizzle-orm';
import { check, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';

export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'ALUMNI', 'MEMBER']);
export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'BANNED']);

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  BANNED: 'BANNED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    email: text('email'),
    phone: text('phone'),
    passwordHash: text('password_hash').notNull(),
    nickname: text('nickname').notNull(),
    avatarUrl: text('avatar_url'),
    role: userRoleEnum('role').notNull().default('MEMBER'),
    status: userStatusEnum('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => [
    uniqueIndex('users_email_key').on(t.email),
    uniqueIndex('users_phone_key').on(t.phone),
    index('users_role_idx').on(t.role),
    index('users_status_idx').on(t.status),
    check('users_email_or_phone_chk', sql`(email is not null or phone is not null)`),
  ],
);
