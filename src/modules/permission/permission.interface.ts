import type { HydratedDocument } from "mongoose";

export interface IPermission {
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PermissionDocument = HydratedDocument<IPermission>;
