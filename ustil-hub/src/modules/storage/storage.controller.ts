import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { UploadsService } from './uploads.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get('files/:key')
  async getFile(
    @Param('key') key: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Buffer> {
    const { data, contentType } = await this.uploadsService.resolveFile(key);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    return data;
  }
}
