import { model, Schema } from "mongoose";
import type { IRole } from "./role.interface.js";

const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    permissions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Permission",
        required: true,
      },
    ],
    isSystemRole: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Role = model<IRole>("Role", roleSchema);
