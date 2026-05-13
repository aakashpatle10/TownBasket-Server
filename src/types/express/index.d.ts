declare global {
  namespace Express {
    interface AuthUser {
      userId: string;
      email: string;
      roleId: string;
      roleName: string;
      permissions: string[];
    }

    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
