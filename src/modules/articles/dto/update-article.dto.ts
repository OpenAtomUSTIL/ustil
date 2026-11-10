import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateArticleDto {
  @IsOptional()
  @IsString({ message: '标题必须是字符串' })
  @IsNotEmpty({ message: '标题不能为空' })
  @MaxLength(200, { message: '标题不能超过 200 个字符' })
  title?: string;

  @IsOptional()
  @IsString({ message: '正文必须是字符串' })
  @IsNotEmpty({ message: '正文不能为空' })
  content?: string;
}
