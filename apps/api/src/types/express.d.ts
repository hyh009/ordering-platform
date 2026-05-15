declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      username: string;
      isSuperAdmin: boolean;
    }

    interface Request {
      requestId: string;
    }
  }
}

export {};
