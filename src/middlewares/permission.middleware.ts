import type { RequestHandler } from "express";
import { PERMISSIONS } from "../constants/permissions.js";
import { isAdmin } from "./auth.middleware.js";
import { AppError } from "../utils/AppError.js";

export const requirePermissions = (...permissions: string[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError(401, "Unauthorized access"));
    }

    if (isAdmin(req)) {
      return next();
    }

    const hasAllRequiredPermissions = permissions.every((permission) => {
      return req.user?.permissions.includes(permission) || req.user?.permissions.includes(PERMISSIONS.ALL);
    });

    if (!hasAllRequiredPermissions) {
      return next(new AppError(403, "Forbidden: missing required permission"));
    }

    return next();
  };
};
