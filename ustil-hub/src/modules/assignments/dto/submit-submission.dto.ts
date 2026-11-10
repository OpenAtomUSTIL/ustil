import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitSubmissionDto {
  @IsOptional()
  @IsString({ message: 'note 必须是字符串' })
  @MaxLength(1000, { message: 'note 不能超过 1000 个字符' })
  note?: string;
}
