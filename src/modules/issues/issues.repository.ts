import { Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '../../db';
import { IssueStatus, issueReplies, issues } from '../../db/schema';

export type IssueRow = typeof issues.$inferSelect;
export type ReplyRow = typeof issueReplies.$inferSelect;

const REPLIES_LIMIT = 100;

@Injectable()
export class IssuesRepository {
  private buildWhere(status?: IssueStatus, keyword?: string) {
    const conditions = [];
    const trimmed = keyword?.trim();
    if (status) {
      conditions.push(eq(issues.status, status));
    }
    if (trimmed) {
      const pattern = `%${trimmed}%`;
      conditions.push(or(ilike(issues.title, pattern), ilike(issues.content, pattern)));
    }
    if (conditions.length === 0) {
      return undefined;
    }
    return and(...conditions);
  }

  async list(
    page: number,
    pageSize: number,
    status?: IssueStatus,
    keyword?: string,
  ): Promise<{ rows: IssueRow[]; total: number }> {
    const where = this.buildWhere(status, keyword);
    const rows = await db
      .select()
      .from(issues)
      .where(where)
      .orderBy(desc(issues.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const totalRows = await db.select({ count: sql<number>`count(*)::int` }).from(issues).where(where);
    return { rows, total: totalRows[0]?.count ?? 0 };
  }

  async findById(id: string): Promise<IssueRow | null> {
    const rows = await db.select().from(issues).where(eq(issues.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async insert(row: { title: string; content: string; authorId: string }): Promise<IssueRow> {
    const inserted = await db.insert(issues).values(row).returning();
    return inserted[0];
  }

  async updateStatus(
    id: string,
    patch: { status: IssueStatus; answeredBy: string | null; answeredAt: Date | null },
  ): Promise<IssueRow | null> {
    const rows = await db.update(issues).set(patch).where(eq(issues.id, id)).returning();
    return rows[0] ?? null;
  }

  async findReplies(issueId: string): Promise<ReplyRow[]> {
    return db
      .select()
      .from(issueReplies)
      .where(eq(issueReplies.issueId, issueId))
      .orderBy(issueReplies.createdAt)
      .limit(REPLIES_LIMIT);
  }

  async insertReply(row: {
    issueId: string;
    authorId: string;
    content: string;
  }): Promise<ReplyRow> {
    const inserted = await db.insert(issueReplies).values(row).returning();
    return inserted[0];
  }

  async countReplies(issueIds: string[]): Promise<Map<string, number>> {
    if (issueIds.length === 0) {
      return new Map();
    }
    const rows = await db
      .select({ issueId: issueReplies.issueId, count: sql<number>`count(*)::int` })
      .from(issueReplies)
      .where(inArray(issueReplies.issueId, issueIds))
      .groupBy(issueReplies.issueId);
    return new Map(rows.map((row) => [row.issueId, row.count]));
  }
}
