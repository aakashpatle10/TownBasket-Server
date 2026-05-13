import type { HydratedDocument, Types } from "mongoose";

export interface IRole {
  name: string;
  permissions: Types.ObjectId[];
  isSystemRole: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type RoleDocument = HydratedDocument<IRole>;
