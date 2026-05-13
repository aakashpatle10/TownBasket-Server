import { Types } from 'mongoose';

export const NOTIFICATION_TYPES = {
  NEW_ORDER: 'new_order',
  ORDER_ACCEPTED: 'order_accepted',
  ORDER_CANCELLED: 'order_cancelled',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_UPDATE: 'order_update',
  NEW_MESSAGE: 'new_message',
  DELIVERY_REQUEST: 'delivery_request',
  DELIVERY_ASSIGNED: 'delivery_assigned',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export type NotificationData = Record<string, unknown>;

export interface INotification {
  userId: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  data?: NotificationData;
  read: boolean;
  createdAt?: Date;
}
