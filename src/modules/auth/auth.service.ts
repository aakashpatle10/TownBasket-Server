import config from "../../config/environment.js";
import { AppError } from "../../utils/AppError.js";
import { type AuthJwtPayload, jwtHelpers } from "../../utils/jwtHelpers.js";
import { Permission } from "../permission/permission.model.js";
import { Role } from "../role/role.model.js";
import { UserService } from "../user/user.service.js";
import { User } from "../user/user.model.js";
import type { ILoginUser, IRefreshToken, IRegisterUser } from "./auth.interface.js";

const buildAuthPayload = async (userId: string, email: string, roleId: string): Promise<AuthJwtPayload> => {
  const role = await Role.findById(roleId).lean();
  if (!role) {
    throw new AppError(403, "User role is not configured");
  }

  const permissions = await Permission.find({ _id: { $in: role.permissions } }).select("name").lean();

  return {
    userId,
    email,
    roleId: role._id.toString(),
    roleName: role.name,
    permissions: permissions.map((permission) => permission.name),
  };
};

const registerUser = async (payload: IRegisterUser): Promise<{ user: unknown; accessToken: string; refreshToken: string }> => {
  const user = await UserService.createUserIntoDB(payload);
  const authPayload = await buildAuthPayload(user._id.toString(), user.email, user.role.toString());
  const tokens = jwtHelpers.generateAuthTokens(authPayload);
  user.refreshToken = tokens.refreshToken;
  await user.save();

  return {
    user,
    ...tokens,
  };
};

const loginUser = async (payload: ILoginUser): Promise<{ accessToken: string; refreshToken: string }> => {
  const user = await User.findOne({ email: payload.email }).select("+password");

  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  if (user.isBlocked) {
    throw new AppError(403, "User is blocked");
  }

  const isPasswordMatched = await user.isPasswordMatched(payload.password);
  if (!isPasswordMatched) {
    throw new AppError(401, "Invalid email or password");
  }

  const authPayload = await buildAuthPayload(user._id.toString(), user.email, user.role.toString());
  const tokens = jwtHelpers.generateAuthTokens(authPayload);
  await User.findByIdAndUpdate(user._id, { $set: { refreshToken: tokens.refreshToken } });

  return tokens;
};

const logoutUser = async (userId: string): Promise<void> => {   
    await User.findByIdAndUpdate(userId, { $set: { refreshToken: null } });
};

const refreshToken = async (payload: IRefreshToken): Promise<{ accessToken: string }> => {
  let decoded;

  try {
    decoded = jwtHelpers.verifyToken(payload.refreshToken, config.jwt.refreshSecret, "refresh");
  } catch (_error) {
    throw new AppError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(decoded.userId).select("+refreshToken").lean();

  if (!user) {
    throw new AppError(401, "User no longer exists");
  }

  if (!user.refreshToken || user.refreshToken !== payload.refreshToken) {
    throw new AppError(401, "Refresh token has been revoked");
  }

  if (user.isBlocked) {
    throw new AppError(403, "User is blocked");
  }

  const authPayload = await buildAuthPayload(user._id.toString(), user.email, user.role.toString());

  return {
    accessToken: jwtHelpers.createToken(
      { ...authPayload, tokenType: "access" },
      config.jwt.accessSecret,
      config.jwt.accessExpiresIn
    ),
  };
};

export const AuthService = {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
};
