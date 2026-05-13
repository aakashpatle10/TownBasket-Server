import z from 'zod';
import { DEVICE_PLATFORMS } from './deviceToken.interface.js';

const devicePlatformValues = Object.values(DEVICE_PLATFORMS) as [string, ...string[]];

export const getNotificationsValidation = z.object({
  query: z.object({
    read: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => {
        if (value === undefined) {
          return undefined;
        }

        return value === 'true';
      }),
  }),
});

export const registerDeviceValidation = z.object({
  body: z.object({
    token: z.string().min(1, 'Device token is required'),
    platform: z.enum(devicePlatformValues).optional(),
    deviceId: z.string().min(1, 'Device id is required').optional(),
  }),
});
