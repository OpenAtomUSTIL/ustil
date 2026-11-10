import { Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { attachments } from '../../db/schema';

export type AttachmentRow = typeof attachments.$inferSelect;

@Injectable()
export class AttachmentsRepository {
  async insert(row: {
    key: string;
    originalName: string;
    size: number;
    mime: string;
    uploaderId: string;
  }): Promise<AttachmentRow> {
    const inserted = await db.insert(attachments).values(row).returning();
    return inserted[0];
  }

  async findById(id: string): Promise<AttachmentRow | null> {
    const rows = await db.select().from(attachments).where(eq(attachments.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async findByIds(ids: string[]): Promise<AttachmentRow[]> {
    if (ids.length === 0) {
      return [];
    }
    return db.select().from(attachments).where(inArray(attachments.id, ids));
  }

  async deleteById(id: string): Promise<void> {
    await db.delete(attachments).where(eq(attachments.id, id));
  }
}
