import mongoose, { Types } from "mongoose";
import { SYSTEM_ROLES } from "../../constants/permissions.js";
import { AppError } from "../../utils/AppError.js";
import { AdminDashboardService } from "../adminDashboard/adminDashboard.service.js";
import { Role } from "../role/role.model.js";
import type { IUser, UserDocument } from "./user.interface.js";
import { User } from "./user.model.js";

type CreateUserPayload = Omit<IUser, "role" | "isBlocked"> & {
  role?: string;
  roleName?: string;
  isBlocked?: boolean;
};

type UpdateUserPayload = Partial<Pick<IUser, "name" | "phone" | "isBlocked">>;

const resolveRoleId = async (payload: Pick<CreateUserPayload, "role" | "roleName">): Promise<Types.ObjectId> => {
  if (payload.role) {
    if (!mongoose.isValidObjectId(payload.role)) {
      throw new AppError(400, "Invalid role id");
    }

    const role = await Role.findById(payload.role).select("_id").lean();
    if (!role) {
      throw new AppError(404, "Role not found");
    }

    return new Types.ObjectId(payload.role);
  }

  const roleName = payload.roleName ?? SYSTEM_ROLES.BUYER;
  const role = await Role.findOne({ name: roleName.toLowerCase() }).select("_id").lean();
  if (!role) {
    throw new AppError(404, `${roleName} role not found. Seed roles before creating users.`);
  }

  return role._id;
};

const createUserIntoDB = async (payload: CreateUserPayload): Promise<UserDocument> => {
  const roleId = await resolveRoleId(payload);

  const user = await User.create({
    name: payload.name,
    email: payload.email,
    password: payload.password,
    phone: payload.phone,
    role: roleId,
    isBlocked: payload.isBlocked ?? false,
  });

  await AdminDashboardService.emitPlatformActivityStats();

  return user;
};

const getAllUsersFromDB = async (): Promise<IUser[]> => {
  return User.find().populate("role").sort({ createdAt: -1 }).lean();
};

const getSingleUserFromDB = async (id: string): Promise<IUser> => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "Invalid user id");
  }

  const user = await User.findById(id).populate("role").lean();
  if (!user) {
    throw new AppError(404, "User not found");
  }

  return user;
};

const updateUserIntoDB = async (id: string, payload: UpdateUserPayload): Promise<IUser> => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "Invalid user id");
  }

  const user = await User.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  })
    .populate("role")
    .lean();

  if (!user) {
    throw new AppError(404, "User not found");
  }

  return user;
};

const assignRoleIntoDB = async (id: string, roleId: string): Promise<IUser> => {
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(roleId)) {
    throw new AppError(400, "Invalid user or role id");
  }

  const role = await Role.findById(roleId).select("_id").lean();
  if (!role) {
    throw new AppError(404, "Role not found");
  }

  const user = await User.findByIdAndUpdate(
    id,
    { role: role._id },
    {
      new: true,
      runValidators: true,
    }
  )
    .populate("role")
    .lean();

  if (!user) {
    throw new AppError(404, "User not found");
  }

  return user;
};

const deleteUserFromDB = async (id: string): Promise<IUser> => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "Invalid user id");
  }

  const user = await User.findByIdAndDelete(id).lean();
  if (!user) {
    throw new AppError(404, "User not found");
  }

  return user;
};

export const UserService = {
  createUserIntoDB,
  getAllUsersFromDB,
  getSingleUserFromDB,
  updateUserIntoDB,
  assignRoleIntoDB,
  deleteUserFromDB,
};
