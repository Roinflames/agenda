import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUser } from '../types/jwt-user.type';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): JwtUser => {
  const req = ctx.switchToHttp().getRequest();
  return req.user as JwtUser;
});

