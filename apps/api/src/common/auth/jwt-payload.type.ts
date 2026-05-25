import type { Role } from '@savdo/db';

export interface JwtPayload {
  userId: string;
  storeId: string;
  role: Role;
  email: string;
}

declare global {
  namespace Express {
    // Augment passport's req.user type with our JWT payload shape.
    interface User extends JwtPayload {}
  }
}
