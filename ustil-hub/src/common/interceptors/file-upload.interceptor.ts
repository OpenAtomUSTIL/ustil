import { NestInterceptor, Type } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DEFAULT_UPLOAD_MAX_SIZE } from '../../config/configuration';

// 统一的内存存储上传拦截器；fileSize 上限由 UPLOAD_MAX_SIZE 控制（兜底，业务层仍会强校验）
export function fileUploadInterceptor(fieldName: string): Type<NestInterceptor> {
  const maxSize = parseInt(process.env.UPLOAD_MAX_SIZE ?? String(DEFAULT_UPLOAD_MAX_SIZE), 10);
  return FileInterceptor(fieldName, {
    limits: { fileSize: maxSize },
  });
}
