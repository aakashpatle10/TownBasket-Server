import mongoose, { Schema } from 'mongoose';
import {
  DELIVERY_ASSIGNMENT_REQUEST_STATUS,
  IDeliveryAssignmentRequest,
} from './deliveryAssignment.interface.js';

const deliveryAssignmentRequestSchema = new Schema<IDeliveryAssignmentRequest>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deliveryPartner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(DELIVERY_ASSIGNMENT_REQUEST_STATUS),
      default: DELIVERY_ASSIGNMENT_REQUEST_STATUS.PENDING,
      required: true,
    },
    respondedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

deliveryAssignmentRequestSchema.index(
  { order: 1, deliveryPartner: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: DELIVERY_ASSIGNMENT_REQUEST_STATUS.PENDING,
    },
  }
);
deliveryAssignmentRequestSchema.index({ deliveryPartner: 1, status: 1, createdAt: -1 });
deliveryAssignmentRequestSchema.index({ order: 1, status: 1 });

export const DeliveryAssignmentRequest = mongoose.model<IDeliveryAssignmentRequest>(
  'DeliveryAssignmentRequest',
  deliveryAssignmentRequestSchema
);

