import type { AuthUserDto } from '@repo/shared';

declare global {
  namespace Express {
    interface User {
      id: AuthUserDto['id'];
      email: AuthUserDto['email'];
      username: AuthUserDto['username'];
      isSuperAdmin: AuthUserDto['isSuperAdmin'];
    }

    interface Request {
      requestId: string;
    }
  }
}

export {};
