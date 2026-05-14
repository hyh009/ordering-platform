import type { UserRole } from '@src/models/user/model';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      username: string;
      roles: UserRole[];
    }

    interface Request {
      requestId: string;
    }
  }
}

export {};
