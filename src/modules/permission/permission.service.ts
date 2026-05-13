import mongoose from "mongoose";
import { AppError } from "../../utils/AppError.js";
import type { IPermission } from "./permission.interface.js";
import { Permission } from "./permission.model.js";

const createPermissionIntoDB = async (payload: IPermission): Promise<IPermission> => {
  return Permission.create(payload);
};

const getAllPermissionsFromDB = async (): Promise<IPermission[]> => {
  return Permission.find().sort({ name: 1 }).lean();
};

const getSinglePermissionFromDB = async (id: string): Promise<IPermission> => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "Invalid permission id");
  }

  const permission = await Permission.findById(id).lean();
  if (!permission) {
    throw new AppError(404, "Permission not found");
  }

  return permission;
};

const updatePermissionIntoDB = async (id: string, payload: Partial<IPermission>): Promise<IPermission> => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "Invalid permission id");
  }

  const permission = await Permission.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).lean();

  if (!permission) {
    throw new AppError(404, "Permission not found");
  }

  return permission;
};

const deletePermissionFromDB = async (id: string): Promise<IPermission> => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "Invalid permission id");
  }

  const permission = await Permission.findByIdAndDelete(id).lean();
  if (!permission) {
    throw new AppError(404, "Permission not found");
  }

  return permission;
};

export const PermissionService = {
  createPermissionIntoDB,
  getAllPermissionsFromDB,
  getSinglePermissionFromDB,
  updatePermissionIntoDB,
  deletePermissionFromDB,
};
