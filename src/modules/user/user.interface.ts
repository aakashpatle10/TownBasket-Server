import type { HydratedDocument, Model, Types } from "mongoose";

export interface IUser {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: Types.ObjectId;
  isBlocked: boolean;
  refreshToken?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserMethods {
  isPasswordMatched(candidatePassword: string): Promise<boolean>;
}

export type UserDocument = HydratedDocument<IUser, IUserMethods>;
export type UserModel = Model<IUser, Record<string, never>, IUserMethods>;
