import mongoose, { Types } from "mongoose";
import { AppError } from "../../utils/AppError.js";
import type { IRole } from "./role.interface.js";
import { Role } from "./role.model.js";

type RolePayload = Omit<IRole, "permissions" | "isSystemRole"> & {
  permissions?: string[];
  isSystemRole?: boolean;
};

const toObjectIds = (permissions: string[] = []): Types.ObjectId[] => {
  return permissions.map((permission) => new Types.ObjectId(permission));
};

const createRoleIntoDB = async (payload: RolePayload): Promise<IRole> => {
  return Role.create({
    ...payload,
    permissions: toObjectIds(payload.permissions),
    isSystemRole: payload.isSystemRole ?? false,
  });
};

const getAllRolesFromDB = async (): Promise<IRole[]> => {
  return Role.find().populate("permissions").sort({ name: 1 }).lean();
};

const getSingleRoleFromDB = async (id: string): Promise<IRole> => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "Invalid role id");
  }

  const role = await Role.findById(id).populate("permissions").lean();
  if (!role) {
    throw new AppError(404, "Role not found");
  }

  return role;
};

const updateRoleIntoDB = async (id: string, payload: Partial<RolePayload>): Promise<IRole> => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "Invalid role id");
  }

  const updatePayload = {
    ...payload,
    ...(payload.permissions ? { permissions: toObjectIds(payload.permissions) } : {}),
  };

  const role = await Role.findByIdAndUpdate(id, updatePayload, {
    new: true,
    runValidators: true,
  })
    .populate("permissions")
    .lean();

  if (!role) {
    throw new AppError(404, "Role not found");
  }

  return role;
};

const deleteRoleFromDB = async (id: string): Promise<IRole> => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "Invalid role id");
  }

  const role = await Role.findById(id);
  if (!role) {
    throw new AppError(404, "Role not found");
  }

  if (role.isSystemRole) {
    throw new AppError(400, "System roles cannot be deleted");
  }

  await role.deleteOne();
  return role;
};

export const RoleService = {
  createRoleIntoDB,
  getAllRolesFromDB,
  getSingleRoleFromDB,
  updateRoleIntoDB,
  deleteRoleFromDB,
};
