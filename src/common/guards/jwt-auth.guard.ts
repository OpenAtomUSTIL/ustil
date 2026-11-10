import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  // token 缺失/无效统一中文文案；strategy 抛出的异常原样透传
  handleRequest<TUser = unknown>(err: unknown, user: unknown): TUser {
    if (err) {
      throw err as Error;
    }
    if (!user) {
      throw new UnauthorizedException('未登录或登录已过期');
    }
    return user as TUser;
  }
}
