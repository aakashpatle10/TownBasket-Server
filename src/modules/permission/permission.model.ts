import { model, Schema } from "mongoose";
import type { IPermission } from "./permission.interface.js";

const permissionSchema = new Schema<IPermission>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Permission = model<IPermission>("Permission", permissionSchema);
