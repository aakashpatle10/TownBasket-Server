import { Types } from 'mongoose';
import type { MulticastMessage } from 'firebase-admin/messaging';
import { getFirebaseMessaging } from '../../config/firebase.js';
import { DeviceToken } from './deviceToken.model.js';
import { NotificationData, NotificationType } from './notification.interface.js';

type PushPayload = {
  userId: string | Types.ObjectId;
  notificationId: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: NotificationData;
};

const ANDROID_NOTIFICATION_CHANNEL_ID = 'commerce_notifications';

const stringifyData = (data: NotificationData = {}): Record<string, string> => {
  return Object.entries(data).reduce<Record<string, string>>((result, [key, value]) => {
    if (value === undefined || value === null) {
      return result;
    }

    result[key] = typeof value === 'string' ? value : JSON.stringify(value);
    return result;
  }, {});
};

const disableTokens = async (tokens: string[]): Promise<void> => {
  if (tokens.length === 0) {
    return;
  }

  await DeviceToken.updateMany(
    {
      token: {
        $in: tokens,
      },
    },
    {
      $set: {
        isActive: false,
      },
    }
  );
};

const sendPushNotification = async (payload: PushPayload): Promise<void> => {
  const messaging = getFirebaseMessaging();
  if (!messaging) {
    return;
  }

  const devices = await DeviceToken.find({
    userId: payload.userId,
    isActive: true,
  }).select('+token');

  if (devices.length === 0) {
    return;
  }

  const tokens = [...new Set(devices.map((device) => device.token))];
  const message: MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.message,
    },
    data: {
      notificationId: payload.notificationId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      ...stringifyData(payload.data),
    },
    android: {
      priority: 'high',
      notification: {
        channelId: ANDROID_NOTIFICATION_CHANNEL_ID,
        title: payload.title,
        body: payload.message,
        sound: 'default',
        priority: 'high',
        defaultSound: true,
      },
    },
  };

  const response = await messaging.sendEachForMulticast(message);
  const failedTokens = response.responses
    .map((result, index) => {
      if (result.success) {
        return null;
      }

      const errorCode = result.error?.code;
      if (errorCode !== 'messaging/registration-token-not-registered' && errorCode !== 'messaging/invalid-registration-token') {
        return null;
      }

      return tokens[index];
    })
    .filter((token): token is string => Boolean(token));

  await Promise.all([
    DeviceToken.updateMany(
      {
        token: {
          $in: tokens,
        },
      },
      {
        $set: {
          lastUsedAt: new Date(),
        },
      }
    ),
    disableTokens(failedTokens),
  ]);
};

export const PushNotificationService = {
  sendPushNotification,
};
