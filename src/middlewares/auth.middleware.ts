import type { NextFunction, Request, RequestHandler, Response } from "express";
import { PERMISSIONS, SYSTEM_ROLES, type SystemRole } from "../constants/permissions.js";
import config from "../config/environment.js";
import { User } from "../modules/user/user.model.js";
import { AppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";
import { jwtHelpers } from "../utils/jwtHelpers.js";

const extractBearerToken = (authorization?: string): string | null => {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.trim().split(/\s+/);
  if (scheme?.toLowerCase() === "bearer" && token) {
    return token;
  }

  // Allow raw token without Bearer prefix
  return authorization.trim() || null;
};

export const authMiddleware = catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    throw new AppError(401, "Unauthorized access. Provide an access token in the Authorization header as 'Bearer <token>'.");
  }

  let decoded;

  try {
    decoded = jwtHelpers.verifyToken(token, config.jwt.accessSecret, "access");
  } catch (_error) {
    try {
      jwtHelpers.verifyToken(token, config.jwt.refreshSecret, "refresh");
      throw new AppError(401, "Refresh token provided in Authorization header. Use access token instead.");
    } catch (_innerError) {
      throw new AppError(401, "Invalid or expired access token");
    }
  }

  const user = await User.findById(decoded.userId).select("isBlocked").lean();

  if (!user) {
    throw new AppError(401, "User no longer exists");
  }

  if (user.isBlocked) {
    throw new AppError(403, "User is blocked");
  }

  req.user = decoded;
  next();
});

export const requireRoles = (...roles: SystemRole[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError(401, "Unauthorized access"));
    }

    if (req.user.roleName === SYSTEM_ROLES.ADMIN || roles.includes(req.user.roleName as SystemRole)) {
      return next();
    }

    return next(new AppError(403, "Forbidden: insufficient role"));
  };
};

export const isAdmin = (req: Request): boolean => {
  return req.user?.roleName === SYSTEM_ROLES.ADMIN || req.user?.permissions.includes(PERMISSIONS.ALL) === true;
};
