import { Injectable } from '@nestjs/common';
import { eq, inArray, or } from 'drizzle-orm';
import { db } from '../../db';
import { UserStatus, users } from '../../db/schema';

export type UserRow = typeof users.$inferSelect;

@Injectable()
export class UsersRepository {
  async insert(row: {
    email: string | null;
    phone: string | null;
    passwordHash: string;
    nickname: string;
  }): Promise<UserRow> {
    const inserted = await db.insert(users).values(row).returning();
    return inserted[0];
  }

  async findById(id: string): Promise<UserRow | null> {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async findByIds(ids: string[]): Promise<UserRow[]> {
    if (ids.length === 0) {
      return [];
    }
    return db.select().from(users).where(inArray(users.id, ids));
  }

  async findByEmailOrPhone(identifier: string): Promise<UserRow | null> {
    const rows = await db
      .select()
      .from(users)
      .where(or(eq(users.email, identifier), eq(users.phone, identifier)))
      .limit(1);
    return rows[0] ?? null;
  }

  async updateProfile(
    id: string,
    patch: { nickname?: string; avatarUrl?: string | null },
  ): Promise<UserRow | null> {
    const rows = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, id))
      .returning();
    return rows[0] ?? null;
  }

  async updateIdentifier(
    id: string,
    patch: { email: string | null; phone: string | null },
  ): Promise<UserRow | null> {
    const rows = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, id))
      .returning();
    return rows[0] ?? null;
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash }).where(eq(users.id, id));
  }

  async updateStatus(id: string, status: UserStatus): Promise<UserRow | null> {
    const rows = await db
      .update(users)
      .set({ status })
      .where(eq(users.id, id))
      .returning();
    return rows[0] ?? null;
  }
}
