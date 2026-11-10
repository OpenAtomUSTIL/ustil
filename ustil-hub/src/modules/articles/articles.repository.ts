import { Injectable } from '@nestjs/common';
import { desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../../db';
import { articles } from '../../db/schema';

export type ArticleRow = typeof articles.$inferSelect;

@Injectable()
export class ArticlesRepository {
  private buildWhere(keyword?: string) {
    const trimmed = keyword?.trim();
    if (!trimmed) {
      return undefined;
    }
    const pattern = `%${trimmed}%`;
    return or(ilike(articles.title, pattern), ilike(articles.content, pattern));
  }

  async list(
    page: number,
    pageSize: number,
    keyword?: string,
  ): Promise<{ rows: ArticleRow[]; total: number }> {
    const where = this.buildWhere(keyword);
    const rows = await db
      .select()
      .from(articles)
      .where(where)
      .orderBy(desc(articles.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const totalRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(articles)
      .where(where);
    return { rows, total: totalRows[0]?.count ?? 0 };
  }

  async findById(id: string): Promise<ArticleRow | null> {
    const rows = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async insert(row: { title: string; content: string; authorId: string }): Promise<ArticleRow> {
    const inserted = await db.insert(articles).values(row).returning();
    return inserted[0];
  }

  async update(
    id: string,
    patch: { title?: string; content?: string },
  ): Promise<ArticleRow | null> {
    const rows = await db
      .update(articles)
      .set(patch)
      .where(eq(articles.id, id))
      .returning();
    return rows[0] ?? null;
  }

  async deleteById(id: string): Promise<void> {
    await db.delete(articles).where(eq(articles.id, id));
  }
}
