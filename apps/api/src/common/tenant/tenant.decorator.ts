import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { TenantContext } from './tenant.types';

export const CurrentTenant = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): TenantContext => {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.tenant) {
      throw new UnauthorizedException('Tenant context missing');
    }
    return req.tenant;
  },
);
