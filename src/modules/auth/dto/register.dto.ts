import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { IsEmailOrPhone } from './is-email-or-phone';

export class RegisterDto {
  @IsEmailOrPhone({ message: '请输入合法的邮箱或手机号' })
  identifier!: string;

  @IsString({ message: '密码必须是字符串' })
  @MinLength(8, { message: '密码长度不能少于 8 位' })
  @MaxLength(128, { message: '密码长度不能超过 128 位' })
  password!: string;

  @IsString({ message: '昵称必须是字符串' })
  @IsNotEmpty({ message: '昵称不能为空' })
  @MaxLength(50, { message: '昵称不能超过 50 个字符' })
  nickname!: string;
}
