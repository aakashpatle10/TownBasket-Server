import mongoose, { Schema } from 'mongoose';
import {
  DELIVERY_AVAILABILITY_STATUS,
  IDeliveryAvailability,
} from './deliveryAvailability.interface.js';

const deliveryAvailabilitySchema = new Schema<IDeliveryAvailability>(
  {
    deliveryPartner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: Object.values(DELIVERY_AVAILABILITY_STATUS),
      default: DELIVERY_AVAILABILITY_STATUS.OFFLINE,
      required: true,
    },
    currentOrder: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    lastOnlineAt: {
      type: Date,
    },
    lastOfflineAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

deliveryAvailabilitySchema.index({ status: 1, updatedAt: -1 });
deliveryAvailabilitySchema.index({ currentOrder: 1 });

export const DeliveryAvailability = mongoose.model<IDeliveryAvailability>(
  'DeliveryAvailability',
  deliveryAvailabilitySchema
);

