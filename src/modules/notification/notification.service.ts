import mongoose, { Types } from 'mongoose';
import { isUserOnline } from '../../socket/presence.manager.js';
import { emitToSeller, emitToUser } from '../../socket/socket.manager.js';
import { AppError } from '../../utils/AppError.js';
import { DEVICE_PLATFORMS, DevicePlatform } from './deviceToken.interface.js';
import { DeviceToken } from './deviceToken.model.js';
import { NotificationData, NOTIFICATION_TYPES, NotificationType } from './notification.interface.js';
import { Notification } from './notification.model.js';
import { PushNotificationService } from './pushNotification.service.js';

type EmittableNotification = {
  _id: Types.ObjectId | string;
  userId: string | Types.ObjectId;
};

type CreateNotificationPayload = {
  userId: string | Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  data?: NotificationData;
};

type CreateNotificationOptions = {
  emitRealtime?: boolean;
  sendPush?: boolean;
};

type GetNotificationsQuery = {
  read?: boolean;
};

type RegisterDevicePayload = {
  token: string;
  platform?: DevicePlatform;
  deviceId?: string;
};

const NOTIFICATION_SOCKET_EVENT = 'notification:new';
export const SELLER_NEW_ORDER_COUNT_SOCKET_EVENT = 'seller:orders:new-count';
const MESSAGE_NOTIFICATION_DEDUPE_WINDOW_MS = 60 * 1000;

const validateNotificationId = (notificationId: string) => {
  if (!mongoose.isValidObjectId(notificationId)) {
    throw new AppError(400, 'Invalid notification id');
  }
};

const emitNotification = (notification: EmittableNotification) => {
  try {
    emitToUser(notification.userId.toString(), NOTIFICATION_SOCKET_EVENT, notification);
  } catch (_error) {
    // Persisted notifications should not fail just because a socket server is unavailable.
  }
};

const sendPushNotification = (notification: EmittableNotification & {
  title: string;
  message: string;
  type: NotificationType;
  data?: NotificationData;
}) => {
  void PushNotificationService.sendPushNotification({
    userId: notification.userId,
    notificationId: notification._id.toString(),
    title: notification.title,
    message: notification.message,
    type: notification.type,
    data: notification.data,
  }).catch(() => {
    // Push delivery is best-effort. Persisted and realtime notifications remain source of truth.
  });
};

const emitSellerNewOrderCount = async (sellerId: string) => {
  const unreadNewOrders = await Notification.countDocuments({
    userId: sellerId,
    type: NOTIFICATION_TYPES.NEW_ORDER,
    read: false,
  });

  try {
    emitToSeller(sellerId, SELLER_NEW_ORDER_COUNT_SOCKET_EVENT, {
      newOrders: unreadNewOrders,
      unreadNewOrders,
      updatedAt: new Date(),
    });
  } catch (_error) {
    // Dashboard counters can be refreshed through the REST endpoint if sockets are unavailable.
  }
};

const createNotification = async (
  payload: CreateNotificationPayload,
  options: CreateNotificationOptions = {}
) => {
  const notification = await Notification.create({
    userId: payload.userId,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    data: payload.data ?? {},
    read: false,
  });

  if (options.emitRealtime ?? true) {
    emitNotification(notification);
  }

  if (options.sendPush ?? true) {
    sendPushNotification(notification);
  }

  return notification;
};

const createNotifications = async (payloads: CreateNotificationPayload[]) => {
  if (payloads.length === 0) {
    return [];
  }

  const notifications = await Notification.insertMany(
    payloads.map((payload) => ({
      userId: payload.userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      data: payload.data ?? {},
      read: false,
    }))
  );

  notifications.forEach((notification) => {
    emitNotification(notification);
    sendPushNotification(notification);
  });

  return notifications;
};

const registerDevice = async (userId: string, payload: RegisterDevicePayload) => {
  if (payload.deviceId) {
    await DeviceToken.updateMany(
      {
        userId,
        deviceId: payload.deviceId,
        token: {
          $ne: payload.token,
        },
      },
      {
        $set: {
          isActive: false,
        },
      }
    );
  }

  const deviceToken = await DeviceToken.findOneAndUpdate(
    {
      token: payload.token,
    },
    {
      $set: {
        userId,
        token: payload.token,
        platform: payload.platform ?? DEVICE_PLATFORMS.ANDROID,
        deviceId: payload.deviceId,
        isActive: true,
        lastRegisteredAt: new Date(),
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );

  return deviceToken;
};

const getUserNotifications = async (userId: string, query: GetNotificationsQuery = {}) => {
  const filter: Record<string, unknown> = {
    userId,
  };

  if (query.read !== undefined) {
    filter.read = query.read;
  }

  return Notification.find(filter).sort({ createdAt: -1 });
};

const markAsRead = async (userId: string, notificationId: string) => {
  validateNotificationId(notificationId);

  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      userId,
    },
    {
      read: true,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!notification) {
    throw new AppError(404, 'Notification not found');
  }

  if (notification.type === NOTIFICATION_TYPES.NEW_ORDER) {
    await emitSellerNewOrderCount(userId);
  }

  return notification;
};

const markMessageNotificationsRead = async (
  userId: string | Types.ObjectId,
  conversationId: string | Types.ObjectId
) => {
  return Notification.updateMany(
    {
      userId,
      type: NOTIFICATION_TYPES.NEW_MESSAGE,
      read: false,
      'data.conversationId': conversationId.toString(),
    },
    {
      $set: {
        read: true,
      },
    }
  );
};

const notifyNewOrder = async (sellerIds: Array<string | Types.ObjectId>, orderId: string | Types.ObjectId) => {
  const uniqueSellerIds = [...new Set(sellerIds.map((sellerId) => sellerId.toString()))];

  const notifications = await createNotifications(
    uniqueSellerIds.map((sellerId) => ({
      userId: sellerId,
      title: 'New order received',
      message: 'A new order has been placed for your shop.',
      type: NOTIFICATION_TYPES.NEW_ORDER,
      data: {
        orderId: orderId.toString(),
      },
    }))
  );

  await Promise.all(uniqueSellerIds.map((sellerId) => emitSellerNewOrderCount(sellerId)));

  return notifications;
};

const notifyOrderAccepted = async (userId: string | Types.ObjectId, orderId: string | Types.ObjectId) => {
  return createNotification({
    userId,
    title: 'Order accepted',
    message: 'Your order has been accepted by the seller.',
    type: NOTIFICATION_TYPES.ORDER_ACCEPTED,
    data: {
      orderId: orderId.toString(),
    },
  });
};

const notifyOrderCancelled = async (userId: string | Types.ObjectId, orderId: string | Types.ObjectId) => {
  return createNotification({
    userId,
    title: 'Order cancelled',
    message: 'Your order has been cancelled.',
    type: NOTIFICATION_TYPES.ORDER_CANCELLED,
    data: {
      orderId: orderId.toString(),
    },
  });
};

const notifyOrderDelivered = async (userId: string | Types.ObjectId, orderId: string | Types.ObjectId) => {
  return createNotification({
    userId,
    title: 'Order delivered',
    message: 'Your order has been delivered.',
    type: NOTIFICATION_TYPES.ORDER_DELIVERED,
    data: {
      orderId: orderId.toString(),
    },
  });
};

const notifyNewMessage = async (
  recipientUserId: string | Types.ObjectId,
  senderUserId: string | Types.ObjectId,
  data: NotificationData = {}
) => {
  const recipientId = recipientUserId.toString();
  const senderId = senderUserId.toString();
  const conversationId = typeof data.conversationId === 'string' ? data.conversationId : undefined;
  const shouldSendPush = !isUserOnline(recipientId);

  if (conversationId) {
    const recentNotification = await Notification.findOne({
      userId: recipientId,
      type: NOTIFICATION_TYPES.NEW_MESSAGE,
      read: false,
      'data.senderUserId': senderId,
      'data.conversationId': conversationId,
      createdAt: {
        $gte: new Date(Date.now() - MESSAGE_NOTIFICATION_DEDUPE_WINDOW_MS),
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (recentNotification) {
      return recentNotification;
    }
  }

  return createNotification({
    userId: recipientId,
    title: 'New message',
    message: 'You have received a new message.',
    type: NOTIFICATION_TYPES.NEW_MESSAGE,
    data: {
      senderUserId: senderId,
      ...data,
    },
  }, {
    emitRealtime: true,
    sendPush: shouldSendPush,
  });
};

const notifyDeliveryAssigned = async (
  userId: string | Types.ObjectId,
  orderId: string | Types.ObjectId,
  data: NotificationData = {}
) => {
  return createNotification({
    userId,
    title: 'Delivery assigned',
    message: 'A delivery partner has been assigned to your order.',
    type: NOTIFICATION_TYPES.DELIVERY_ASSIGNED,
    data: {
      orderId: orderId.toString(),
      ...data,
    },
  });
};

const notifyDeliveryRequest = async (
  deliveryUserId: string | Types.ObjectId,
  orderId: string | Types.ObjectId,
  data: NotificationData = {}
) => {
  return createNotification({
    userId: deliveryUserId,
    title: 'New delivery request',
    message: 'A new delivery request is available.',
    type: NOTIFICATION_TYPES.DELIVERY_REQUEST,
    data: {
      orderId: orderId.toString(),
      ...data,
    },
  });
};

const notifyOrderUpdate = async (
  userId: string | Types.ObjectId,
  orderId: string | Types.ObjectId,
  status: string,
  data: NotificationData = {}
) => {
  return createNotification({
    userId,
    title: 'Order update',
    message: `Your order status is now ${status}.`,
    type: NOTIFICATION_TYPES.ORDER_UPDATE,
    data: {
      orderId: orderId.toString(),
      status,
      ...data,
    },
  });
};

export const NotificationService = {
  createNotification,
  createNotifications,
  registerDevice,
  getUserNotifications,
  markAsRead,
  markMessageNotificationsRead,
  notifyNewOrder,
  notifyOrderAccepted,
  notifyOrderCancelled,
  notifyOrderDelivered,
  notifyOrderUpdate,
  notifyNewMessage,
  notifyDeliveryRequest,
  notifyDeliveryAssigned,
};
