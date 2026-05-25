import type { Role } from '@savdo/db';

export interface TenantContext {
  userId: string;
  storeId: string;
  role: Role;
}

declare module 'express' {
  interface Request {
    tenant?: TenantContext;
  }
}
