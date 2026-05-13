import bcrypt from "bcrypt";
import { model, Schema } from "mongoose";
import config from "../../config/environment.js";
import type { IUser, IUserMethods, UserDocument, UserModel } from "./user.interface.js";

const removeSensitiveFields = (_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> => {
  delete ret.password;
  delete ret.refreshToken;
  return ret;
};

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: removeSensitiveFields,
    },
    toObject: {
      transform: removeSensitiveFields,
    },
  }
);

userSchema.pre("save", async function (this: UserDocument) {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, config.bcrypt.saltRounds);
});

userSchema.methods.isPasswordMatched = async function (
  this: UserDocument,
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = model<IUser, UserModel>("User", userSchema);
