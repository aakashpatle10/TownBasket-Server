import { Types } from 'mongoose';

export const DELIVERY_ASSIGNMENT_REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export type DeliveryAssignmentRequestStatus =
  (typeof DELIVERY_ASSIGNMENT_REQUEST_STATUS)[keyof typeof DELIVERY_ASSIGNMENT_REQUEST_STATUS];

export interface IDeliveryAssignmentRequest {
  order: Types.ObjectId;
  seller: Types.ObjectId;
  deliveryPartner: Types.ObjectId;
  status: DeliveryAssignmentRequestStatus;
  respondedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

