import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { AppConfig, configuration } from '../../config/configuration';
import { AttachmentsRepository, AttachmentRow } from './attachments.repository';
import {
  AttachmentView,
  STORAGE_SERVICE,
  StorageContentReader,
  StorageService,
} from './storage.types';

export interface UploadedFileInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

// 作业提交文件白名单：扩展名 → 允许的 mime（双校验）
const ASSIGNMENT_ALLOWED: Record<string, string[]> = {
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  pdf: ['application/pdf'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  zip: ['application/zip', 'application/x-zip-compressed'],
};

// 头像白名单：png / jpg / jpeg
const AVATAR_ALLOWED: Record<string, string[]> = {
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
};

@Injectable()
export class UploadsService {
  constructor(
    @Inject(STORAGE_SERVICE)
    private readonly storage: StorageService & StorageContentReader,
    private readonly attachmentsRepository: AttachmentsRepository,
    @Inject(configuration.KEY) private readonly cfg: AppConfig,
  ) {}

  private fileExt(originalName: string): string {
    const parts = originalName.split('.');
    return parts.length > 1 ? (parts.pop() as string).toLowerCase() : '';
  }

  private validate(file: UploadedFileInput, allowed: Record<string, string[]>): string {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('请上传文件');
    }
    const ext = this.fileExt(file.originalname);
    const mime = file.mimetype.toLowerCase();
    const allowedMimes = allowed[ext];
    if (!allowedMimes || !allowedMimes.includes(mime)) {
      throw new BadRequestException('文件格式不支持');
    }
    const size = file.size > 0 ? file.size : file.buffer.length;
    if (size > this.cfg.uploadMaxSize) {
      const maxMb = Math.floor(this.cfg.uploadMaxSize / 1024 / 1024);
      throw new BadRequestException(`文件大小超出限制，最大 ${maxMb}MB`);
    }
    return ext;
  }

  private buildKey(ext: string): string {
    return `${uuidv7()}.${ext}`;
  }

  private toView(row: AttachmentRow): AttachmentView {
    return {
      id: row.id,
      key: row.key,
      originalName: row.originalName,
      size: row.size,
      mime: row.mime,
      url: this.storage.getUrl(row.key),
    };
  }

  // 作业提交附件：校验 → 落盘 → 记录 attachments
  async saveAssignmentFile(file: UploadedFileInput, uploaderId: string): Promise<AttachmentView> {
    const ext = this.validate(file, ASSIGNMENT_ALLOWED);
    const key = this.buildKey(ext);
    const size = file.size > 0 ? file.size : file.buffer.length;
    await this.storage.put(key, file.buffer, file.mimetype.toLowerCase());
    try {
      const row = await this.attachmentsRepository.insert({
        key,
        originalName: file.originalname,
        size,
        mime: file.mimetype.toLowerCase(),
        uploaderId,
      });
      return this.toView(row);
    } catch (error) {
      await this.storage.remove(key);
      throw error;
    }
  }

  // 头像文件：只落盘，不写 attachments 表
  async storeAvatar(file: UploadedFileInput): Promise<string> {
    const ext = this.validate(file, AVATAR_ALLOWED);
    const key = this.buildKey(ext);
    await this.storage.put(key, file.buffer, file.mimetype.toLowerCase());
    return this.storage.getUrl(key);
  }

  async getAttachmentView(id: string): Promise<AttachmentView | null> {
    const row = await this.attachmentsRepository.findById(id);
    return row ? this.toView(row) : null;
  }

  async getAttachmentViews(ids: string[]): Promise<Map<string, AttachmentView>> {
    const rows = await this.attachmentsRepository.findByIds(ids);
    return new Map(rows.map((row) => [row.id, this.toView(row)]));
  }

  async removeAttachment(id: string): Promise<void> {
    const row = await this.attachmentsRepository.findById(id);
    if (!row) {
      return;
    }
    await this.storage.remove(row.key).catch(() => undefined);
    await this.attachmentsRepository.deleteById(id);
  }

  async resolveFile(key: string): Promise<{ data: Buffer; contentType: string }> {
    if (!key) {
      throw new NotFoundException('文件不存在');
    }
    return this.storage.get(key);
  }
}
