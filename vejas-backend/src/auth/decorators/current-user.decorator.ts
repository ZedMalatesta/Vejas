import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtUser } from '../../rooms/room.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtUser =>
    context.switchToHttp().getRequest().user,
);
