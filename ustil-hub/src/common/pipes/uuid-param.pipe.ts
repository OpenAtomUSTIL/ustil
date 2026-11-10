import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';

// 路径参数 UUID 校验，错误文案使用中文
export const uuidParamPipe = new ParseUUIDPipe({
  exceptionFactory: () => new BadRequestException('ID 格式错误'),
});
