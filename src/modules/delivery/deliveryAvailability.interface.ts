import { Types } from 'mongoose';

export const DELIVERY_AVAILABILITY_STATUS = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  OFFLINE: 'offline',
} as const;

export type DeliveryAvailabilityStatus =
  (typeof DELIVERY_AVAILABILITY_STATUS)[keyof typeof DELIVERY_AVAILABILITY_STATUS];

export interface IDeliveryAvailability {
  deliveryPartner: Types.ObjectId;
  status: DeliveryAvailabilityStatus;
  currentOrder?: Types.ObjectId | null;
  lastOnlineAt?: Date;
  lastOfflineAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

