import { ValidationPipe } from '@nestjs/common';

// 全局校验管道固定配置（AGENTS.md §9）
export const appValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
