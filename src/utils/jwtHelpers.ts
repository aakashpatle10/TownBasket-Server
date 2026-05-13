import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import config from "../config/environment.js";

export type AuthJwtPayload = {
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
  permissions: string[];
};

export type JwtTokenPayload = AuthJwtPayload & {
  tokenType: "access" | "refresh";
};

const createToken = (
  payload: JwtTokenPayload,
  secret: string,
  expiresIn: SignOptions["expiresIn"]
): string => {
  return jwt.sign(payload, secret, { expiresIn });
};

const verifyToken = (
  token: string,
  secret: string,
  expectedType: JwtTokenPayload["tokenType"]
): AuthJwtPayload => {
  const decoded = jwt.verify(token, secret) as JwtPayload & Partial<JwtTokenPayload>;

  if (decoded.tokenType !== undefined && decoded.tokenType !== expectedType) {
    throw new Error("Invalid token type");
  }

  if (
    typeof decoded.userId !== "string" ||
    typeof decoded.email !== "string" ||
    typeof decoded.roleId !== "string" ||
    typeof decoded.roleName !== "string" ||
    !Array.isArray(decoded.permissions)
  ) {
    throw new Error("Invalid token payload");
  }

  return {
    userId: decoded.userId,
    email: decoded.email,
    roleId: decoded.roleId,
    roleName: decoded.roleName,
    permissions: decoded.permissions.filter((permission): permission is string => {
      return typeof permission === "string";
    }),
  };
};

const generateAuthTokens = (
  payload: AuthJwtPayload
): { accessToken: string; refreshToken: string } => {
  return {
    accessToken: createToken(
      { ...payload, tokenType: "access" },
      config.jwt.accessSecret,
      config.jwt.accessExpiresIn
    ),
    refreshToken: createToken(
      { ...payload, tokenType: "refresh" },
      config.jwt.refreshSecret,
      config.jwt.refreshExpiresIn
    ),
  };
};

export const jwtHelpers = {
  createToken,
  verifyToken,
  generateAuthTokens,
};
