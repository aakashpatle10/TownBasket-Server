import mongoose, { Schema } from 'mongoose';
import { DEVICE_PLATFORMS, IDeviceToken } from './deviceToken.interface.js';

const removeSensitiveToken = (_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> => {
  delete ret.token;
  return ret;
};

const deviceTokenSchema = new Schema<IDeviceToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    platform: {
      type: String,
      enum: Object.values(DEVICE_PLATFORMS),
      default: DEVICE_PLATFORMS.ANDROID,
    },
    deviceId: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastRegisteredAt: {
      type: Date,
      default: Date.now,
    },
    lastUsedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: removeSensitiveToken,
    },
    toObject: {
      transform: removeSensitiveToken,
    },
  }
);

deviceTokenSchema.index({ userId: 1, isActive: 1 });
deviceTokenSchema.index({ token: 1 }, { unique: true });

export const DeviceToken = mongoose.model<IDeviceToken>('DeviceToken', deviceTokenSchema);
