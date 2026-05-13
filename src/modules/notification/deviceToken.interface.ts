import { Types } from 'mongoose';

export const DEVICE_PLATFORMS = {
  ANDROID: 'android',
} as const;

export type DevicePlatform = (typeof DEVICE_PLATFORMS)[keyof typeof DEVICE_PLATFORMS];

export interface IDeviceToken {
  userId: Types.ObjectId;
  token: string;
  platform: DevicePlatform;
  deviceId?: string;
  isActive: boolean;
  lastRegisteredAt: Date;
  lastUsedAt?: Date;
}
