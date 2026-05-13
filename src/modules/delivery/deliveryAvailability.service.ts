import mongoose, { Types } from 'mongoose';
import { SYSTEM_ROLES } from '../../constants/permissions.js';
import { emitToAll, emitToUser } from '../../socket/socket.manager.js';
import { AppError } from '../../utils/AppError.js';
import { Role } from '../role/role.model.js';
import { User } from '../user/user.model.js';
import {
  DELIVERY_AVAILABILITY_STATUS,
  DeliveryAvailabilityStatus,
} from './deliveryAvailability.interface.js';
import { DeliveryAvailability } from './deliveryAvailability.model.js';

const DELIVERY_STATUS_UPDATE_EVENT = 'DELIVERY_PARTNER_STATUS_UPDATE';
const LEGACY_DELIVERY_STATUS_UPDATE_EVENT = 'delivery:status-update';

const validateObjectId = (id: string | Types.ObjectId, entity: string) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, `Invalid ${entity} id`);
  }
};

const emitStatusUpdate = (payload: {
  deliveryPartner: string;
  status: DeliveryAvailabilityStatus;
  currentOrder?: string | null;
}) => {
  try {
    emitToUser(payload.deliveryPartner, DELIVERY_STATUS_UPDATE_EVENT, payload);
    emitToAll(DELIVERY_STATUS_UPDATE_EVENT, payload);
    emitToAll(LEGACY_DELIVERY_STATUS_UPDATE_EVENT, payload);
  } catch (_error) {
    // Availability is persisted; realtime status is best-effort.
  }
};

const assertDeliveryPartner = async (deliveryPartnerId: string | Types.ObjectId) => {
  validateObjectId(deliveryPartnerId, 'delivery partner');

  const deliveryRole = await Role.findOne({ name: SYSTEM_ROLES.DELIVERY }).select('_id').lean();
  if (!deliveryRole) {
    throw new AppError(400, 'Delivery role is not configured');
  }

  const deliveryPartner = await User.exists({
    _id: deliveryPartnerId,
    role: deliveryRole._id,
    isBlocked: false,
  });

  if (!deliveryPartner) {
    throw new AppError(404, 'Delivery partner not found');
  }
};

const getOrCreateStatus = async (deliveryPartnerId: string | Types.ObjectId) => {
  await assertDeliveryPartner(deliveryPartnerId);

  return DeliveryAvailability.findOneAndUpdate(
    { deliveryPartner: deliveryPartnerId },
    {
      $setOnInsert: {
        deliveryPartner: deliveryPartnerId,
        status: DELIVERY_AVAILABILITY_STATUS.OFFLINE,
        currentOrder: null,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );
};

const goOnline = async (deliveryPartnerId: string) => {
  await assertDeliveryPartner(deliveryPartnerId);

  const availability = await DeliveryAvailability.findOneAndUpdate(
    {
      deliveryPartner: deliveryPartnerId,
      status: { $ne: DELIVERY_AVAILABILITY_STATUS.BUSY },
    },
    {
      $set: {
        status: DELIVERY_AVAILABILITY_STATUS.AVAILABLE,
        currentOrder: null,
        lastOnlineAt: new Date(),
      },
      $setOnInsert: {
        deliveryPartner: deliveryPartnerId,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );

  emitStatusUpdate({
    deliveryPartner: availability.deliveryPartner.toString(),
    status: availability.status,
    currentOrder: availability.currentOrder?.toString() ?? null,
  });

  return availability;
};

const goOffline = async (deliveryPartnerId: string) => {
  await assertDeliveryPartner(deliveryPartnerId);

  const currentAvailability = await DeliveryAvailability.findOne({ deliveryPartner: deliveryPartnerId }).lean();
  if (currentAvailability?.status === DELIVERY_AVAILABILITY_STATUS.BUSY) {
    throw new AppError(400, 'Cannot go offline while assigned to an active delivery');
  }

  const availability = await DeliveryAvailability.findOneAndUpdate(
    { deliveryPartner: deliveryPartnerId },
    {
      $set: {
        status: DELIVERY_AVAILABILITY_STATUS.OFFLINE,
        currentOrder: null,
        lastOfflineAt: new Date(),
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );

  emitStatusUpdate({
    deliveryPartner: availability.deliveryPartner.toString(),
    status: availability.status,
    currentOrder: availability.currentOrder?.toString() ?? null,
  });

  return availability;
};

const markBusyForOrder = async (
  deliveryPartnerId: string | Types.ObjectId,
  orderId: string | Types.ObjectId
) => {
  await assertDeliveryPartner(deliveryPartnerId);
  validateObjectId(orderId, 'order');

  const availability = await DeliveryAvailability.findOneAndUpdate(
    {
      deliveryPartner: deliveryPartnerId,
      status: DELIVERY_AVAILABILITY_STATUS.AVAILABLE,
    },
    {
      $set: {
        status: DELIVERY_AVAILABILITY_STATUS.BUSY,
        currentOrder: orderId,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!availability) {
    throw new AppError(400, 'Delivery partner is not available');
  }

  emitStatusUpdate({
    deliveryPartner: availability.deliveryPartner.toString(),
    status: availability.status,
    currentOrder: availability.currentOrder?.toString() ?? null,
  });

  return availability;
};

const releaseFromOrder = async (
  deliveryPartnerId: string | Types.ObjectId,
  orderId: string | Types.ObjectId
) => {
  validateObjectId(deliveryPartnerId, 'delivery partner');
  validateObjectId(orderId, 'order');

  const availability = await DeliveryAvailability.findOneAndUpdate(
    {
      deliveryPartner: deliveryPartnerId,
      currentOrder: orderId,
      status: DELIVERY_AVAILABILITY_STATUS.BUSY,
    },
    {
      $set: {
        status: DELIVERY_AVAILABILITY_STATUS.AVAILABLE,
        currentOrder: null,
        lastOnlineAt: new Date(),
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!availability) {
    return null;
  }

  emitStatusUpdate({
    deliveryPartner: availability.deliveryPartner.toString(),
    status: availability.status,
    currentOrder: availability.currentOrder?.toString() ?? null,
  });

  return availability;
};

const getActiveDeliveryPartners = async () => {
  return DeliveryAvailability.find({
    status: DELIVERY_AVAILABILITY_STATUS.AVAILABLE,
  })
    .populate('deliveryPartner', 'name email phone role')
    .sort({ updatedAt: -1 });
};

export const DeliveryAvailabilityService = {
  getOrCreateStatus,
  goOnline,
  goOffline,
  markBusyForOrder,
  releaseFromOrder,
  getActiveDeliveryPartners,
};
