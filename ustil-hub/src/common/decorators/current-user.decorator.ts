import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from './roles.decorator';

export interface CurrentAuthUser {
  id: string;
  role: Role;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentAuthUser | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<{ user?: CurrentAuthUser }>();
    return data ? request.user?.[data] : request.user;
  },
);
