import mongoose, { ClientSession, Types } from 'mongoose';
import { AppError } from '../../utils/AppError.js';
import { MODERATION_TARGET_TYPE } from '../moderation/moderation.interface.js';
import { ModerationService } from '../moderation/moderation.service.js';
import { ORDER_STATUS } from '../order/order.interface.js';
import { Order } from '../order/order.model.js';
import { NotificationService } from '../notification/notification.service.js';
import { Conversation } from './conversation.model.js';
import { Message } from './message.model.js';
import {
  CONVERSATION_PARTICIPANT_ROLE,
  CONVERSATION_STATUS,
  CONVERSATION_TYPE,
  ConversationParticipantRole,
  ConversationType,
  IConversationParticipant,
  MESSAGE_TYPE,
  MessageType,
} from './messaging.interface.js';

type SessionOption = {
  session?: ClientSession;
};

type CreateOrderConversationPayload = {
  orderId: string | Types.ObjectId;
  buyerId: string | Types.ObjectId;
  sellerIds: Array<string | Types.ObjectId>;
};

type CreateSellerDeliveryConversationPayload = {
  orderId: string | Types.ObjectId;
  sellerIds: Array<string | Types.ObjectId>;
  deliveryPartnerId: string | Types.ObjectId;
};

type CreateMessagePayload = {
  conversationId: string | Types.ObjectId;
  senderId: string | Types.ObjectId;
  receiverId: string | Types.ObjectId;
  message: string;
  messageType?: MessageType;
};

type GetMessagesOptions = {
  limit?: number;
  before?: string | Date;
};

type GetOrderChatOptions = {
  limit?: number;
  chatType?: ConversationType;
};

const isChatInactiveStatus = (status: string): boolean => {
  return status === ORDER_STATUS.DELIVERED || status === ORDER_STATUS.CANCELLED;
};

const validateObjectId = (id: string | Types.ObjectId, entity: string) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, `Invalid ${entity} id`);
  }
};

const toObjectId = (id: string | Types.ObjectId): Types.ObjectId => {
  return id instanceof Types.ObjectId ? id : new Types.ObjectId(id);
};

const buildParticipant = (
  userId: string | Types.ObjectId,
  role: ConversationParticipantRole
): IConversationParticipant => ({
  userId: toObjectId(userId),
  role,
  joinedAt: new Date(),
});

const uniqueParticipants = (participants: IConversationParticipant[]): IConversationParticipant[] => {
  const participantByUserAndRole = new Map<string, IConversationParticipant>();

  for (const participant of participants) {
    participantByUserAndRole.set(`${participant.userId.toString()}:${participant.role}`, participant);
  }

  return [...participantByUserAndRole.values()];
};

const assertConversationParticipant = (
  participants: IConversationParticipant[],
  userId: string | Types.ObjectId,
  label: string
) => {
  const normalizedUserId = toObjectId(userId).toString();
  const isParticipant = participants.some((participant) => participant.userId.toString() === normalizedUserId);

  if (!isParticipant) {
    throw new AppError(403, `${label} is not a conversation participant`);
  }
};

const findConversationByOrderId = async (
  orderId: string | Types.ObjectId,
  chatType: ConversationType = CONVERSATION_TYPE.BUYER_SELLER,
  session?: ClientSession
) => {
  if (chatType === CONVERSATION_TYPE.BUYER_SELLER) {
    return Conversation.findOne({
      orderId,
      $or: [{ chatType }, { chatType: { $exists: false } }],
    }).session(session ?? null);
  }

  return Conversation.findOne({ orderId, chatType }).session(session ?? null);
};

const getConversationUnreadCount = async (
  conversationId: string | Types.ObjectId,
  userId: string | Types.ObjectId
) => {
  return Message.countDocuments({
    conversationId,
    receiverId: userId,
    seenBy: { $ne: userId },
    deletedFor: { $ne: userId },
  });
};

const assertOrderChatAccess = async (
  orderId: string | Types.ObjectId,
  userId: string | Types.ObjectId,
  chatType: ConversationType = CONVERSATION_TYPE.BUYER_SELLER
) => {
  validateObjectId(orderId, 'order');
  validateObjectId(userId, 'user');

  const [order, conversation] = await Promise.all([
    Order.findById(orderId).select('user orderStatus deliveryPartner').lean(),
    findConversationByOrderId(orderId, chatType),
  ]);

  if (!order) {
    throw new AppError(404, 'Order not found');
  }

  if (!conversation) {
    throw new AppError(404, 'Conversation not found');
  }

  assertConversationParticipant(conversation.participants, userId, 'User');

  if (chatType === CONVERSATION_TYPE.SELLER_DELIVERY && !order.deliveryPartner) {
    throw new AppError(403, 'Delivery partner has not been assigned to this order');
  }

  if (chatType === CONVERSATION_TYPE.SELLER_DELIVERY) {
    const assignedDeliveryPartnerId = order.deliveryPartner?.toString();
    const deliveryParticipant = conversation.participants.find(
      (participant) => participant.role === CONVERSATION_PARTICIPANT_ROLE.DELIVERY_PARTNER
    );

    if (!deliveryParticipant || deliveryParticipant.userId.toString() !== assignedDeliveryPartnerId) {
      throw new AppError(403, 'Only the assigned delivery partner can access this chat');
    }
  }

  const isChatActive =
    conversation.status === CONVERSATION_STATUS.ACTIVE &&
    !isChatInactiveStatus(order.orderStatus);

  return {
    order,
    conversation,
    isChatActive,
  };
};

const createOrderConversation = async (
  payload: CreateOrderConversationPayload,
  session?: ClientSession
) => {
  validateObjectId(payload.orderId, 'order');
  validateObjectId(payload.buyerId, 'buyer');

  for (const sellerId of payload.sellerIds) {
    validateObjectId(sellerId, 'seller');
  }

  const orderExists = await Order.exists({ _id: payload.orderId }).session(session ?? null);
  if (!orderExists) {
    throw new AppError(404, 'Order not found');
  }

  const participants = uniqueParticipants([
    buildParticipant(payload.buyerId, CONVERSATION_PARTICIPANT_ROLE.BUYER),
    ...payload.sellerIds.map((sellerId) => buildParticipant(sellerId, CONVERSATION_PARTICIPANT_ROLE.SELLER)),
  ]);

  const [conversation] = await Conversation.create(
    [
      {
        orderId: payload.orderId,
        chatType: CONVERSATION_TYPE.BUYER_SELLER,
        participants,
        status: CONVERSATION_STATUS.ACTIVE,
      },
    ],
    { session }
  );

  return conversation;
};

const getOrCreateOrderConversation = async (
  payload: CreateOrderConversationPayload,
  session?: ClientSession
) => {
  validateObjectId(payload.orderId, 'order');

  const existingConversation = await findConversationByOrderId(
    payload.orderId,
    CONVERSATION_TYPE.BUYER_SELLER,
    session
  );
  if (existingConversation) {
    return existingConversation;
  }

  return createOrderConversation(payload, session);
};

const getOrCreateSellerDeliveryConversation = async (
  payload: CreateSellerDeliveryConversationPayload,
  session?: ClientSession
) => {
  validateObjectId(payload.orderId, 'order');
  validateObjectId(payload.deliveryPartnerId, 'delivery partner');

  for (const sellerId of payload.sellerIds) {
    validateObjectId(sellerId, 'seller');
  }

  const order = await Order.findById(payload.orderId)
    .select('deliveryPartner orderStatus')
    .session(session ?? null)
    .lean();

  if (!order) {
    throw new AppError(404, 'Order not found');
  }

  if (order.deliveryPartner?.toString() !== toObjectId(payload.deliveryPartnerId).toString()) {
    throw new AppError(403, 'Delivery partner is not assigned to this order');
  }

  if (isChatInactiveStatus(order.orderStatus)) {
    throw new AppError(400, 'Chat is closed for this order');
  }

  const existingConversation = await findConversationByOrderId(
    payload.orderId,
    CONVERSATION_TYPE.SELLER_DELIVERY,
    session
  );

  const participants = uniqueParticipants([
    ...payload.sellerIds.map((sellerId) => buildParticipant(sellerId, CONVERSATION_PARTICIPANT_ROLE.SELLER)),
    buildParticipant(payload.deliveryPartnerId, CONVERSATION_PARTICIPANT_ROLE.DELIVERY_PARTNER),
  ]);

  if (existingConversation) {
    existingConversation.participants = participants;
    existingConversation.status = CONVERSATION_STATUS.ACTIVE;
    await existingConversation.save({ session });

    return existingConversation;
  }

  const [conversation] = await Conversation.create(
    [
      {
        orderId: payload.orderId,
        chatType: CONVERSATION_TYPE.SELLER_DELIVERY,
        participants,
        status: CONVERSATION_STATUS.ACTIVE,
      },
    ],
    { session }
  );

  return conversation;
};

const createMessage = async (payload: CreateMessagePayload, options: SessionOption = {}) => {
  validateObjectId(payload.conversationId, 'conversation');
  validateObjectId(payload.senderId, 'sender');
  validateObjectId(payload.receiverId, 'receiver');

  const conversation = await Conversation.findById(payload.conversationId).session(options.session ?? null);
  if (!conversation) {
    throw new AppError(404, 'Conversation not found');
  }

  if (conversation.status !== CONVERSATION_STATUS.ACTIVE) {
    throw new AppError(400, 'Conversation is not active');
  }

  const order = await Order.findById(conversation.orderId).select('orderStatus deliveryPartner').lean();
  if (!order) {
    throw new AppError(404, 'Order not found');
  }

  if (isChatInactiveStatus(order.orderStatus)) {
    throw new AppError(400, 'Chat is closed for this order');
  }

  assertConversationParticipant(conversation.participants, payload.senderId, 'Sender');
  assertConversationParticipant(conversation.participants, payload.receiverId, 'Receiver');

  if (conversation.chatType === CONVERSATION_TYPE.SELLER_DELIVERY) {
    const assignedDeliveryPartnerId = order.deliveryPartner?.toString();
    const deliveryParticipant = conversation.participants.find(
      (participant) => participant.role === CONVERSATION_PARTICIPANT_ROLE.DELIVERY_PARTNER
    );

    if (!assignedDeliveryPartnerId || deliveryParticipant?.userId.toString() !== assignedDeliveryPartnerId) {
      throw new AppError(403, 'Only the assigned delivery partner can access this chat');
    }
  }

  const messageType = payload.messageType ?? MESSAGE_TYPE.TEXT;
  const [message] = await Message.create(
    [
      {
        conversationId: conversation._id,
        orderId: conversation.orderId,
        senderId: payload.senderId,
        receiverId: payload.receiverId,
        message: payload.message,
        messageType,
        seenBy: [payload.senderId],
      },
    ],
    { session: options.session }
  );

  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessage: {
          messageId: message._id,
          senderId: message.senderId,
          message: message.message,
          messageType: message.messageType,
          createdAt: message.createdAt,
        },
        lastMessageAt: message.createdAt,
      },
    },
    { session: options.session }
  );

  await ModerationService.moderateContentSafely({
    targetType: MODERATION_TARGET_TYPE.CHAT_MESSAGE,
    target: message._id,
    user: payload.senderId,
    text: message.message,
  });

  void NotificationService.notifyNewMessage(payload.receiverId, payload.senderId, {
    orderId: conversation.orderId.toString(),
    conversationId: conversation._id.toString(),
    chatType: conversation.chatType,
    messageId: message._id.toString(),
  }).catch(() => {
    // Realtime delivery and persistence should not fail if notifications cannot be created.
  });

  return message;
};

const getOrderChat = async (orderId: string, userId: string, options: GetOrderChatOptions = {}) => {
  const { conversation, isChatActive } = await assertOrderChatAccess(
    orderId,
    userId,
    options.chatType ?? CONVERSATION_TYPE.BUYER_SELLER
  );
  const messages = await getMessages(conversation.id, userId, { limit: options.limit ?? 50 });
  const unreadCount = await getConversationUnreadCount(conversation._id, userId);

  return {
    conversation,
    messages: messages.reverse(),
    unreadCount,
    isChatActive,
  };
};

const getConversationByOrder = async (orderId: string, userId: string) => {
  validateObjectId(orderId, 'order');
  validateObjectId(userId, 'user');

  const conversation = await Conversation.findOne({
    orderId,
    $or: [{ chatType: CONVERSATION_TYPE.BUYER_SELLER }, { chatType: { $exists: false } }],
    'participants.userId': userId,
  });

  if (!conversation) {
    throw new AppError(404, 'Conversation not found');
  }

  return conversation;
};

const getMyConversations = async (userId: string) => {
  validateObjectId(userId, 'user');

  return Conversation.find({ 'participants.userId': userId })
    .populate('orderId')
    .sort({ lastMessageAt: -1, updatedAt: -1 });
};

const getMessages = async (conversationId: string, userId: string, options: GetMessagesOptions = {}) => {
  validateObjectId(conversationId, 'conversation');
  validateObjectId(userId, 'user');

  const conversation = await Conversation.findById(conversationId).select('participants').lean();
  if (!conversation) {
    throw new AppError(404, 'Conversation not found');
  }

  assertConversationParticipant(conversation.participants, userId, 'User');

  const query: Record<string, unknown> = {
    conversationId,
    deletedFor: { $ne: userId },
  };

  if (options.before) {
    query.createdAt = { $lt: new Date(options.before) };
  }

  const limit = Math.min(options.limit ?? 50, 100);

  return Message.find(query).sort({ createdAt: -1 }).limit(limit);
};

const markMessagesSeen = async (conversationId: string, userId: string) => {
  validateObjectId(conversationId, 'conversation');
  validateObjectId(userId, 'user');

  const conversation = await Conversation.findById(conversationId).select('participants').lean();
  if (!conversation) {
    throw new AppError(404, 'Conversation not found');
  }

  assertConversationParticipant(conversation.participants, userId, 'User');

  const result = await Message.updateMany(
    {
      conversationId,
      receiverId: userId,
      seenBy: { $ne: userId },
    },
    {
      $addToSet: {
        seenBy: userId,
      },
    }
  );

  await NotificationService.markMessageNotificationsRead(userId, conversationId);

  return result;
};

const markOrderChatSeen = async (orderId: string, userId: string) => {
  const { conversation } = await assertOrderChatAccess(orderId, userId);
  await markMessagesSeen(conversation.id, userId);

  return {
    conversationId: conversation.id,
    unreadCount: 0,
  };
};

const closeConversationsForOrder = async (orderId: string | Types.ObjectId, options: SessionOption = {}) => {
  validateObjectId(orderId, 'order');

  await Conversation.updateMany(
    { orderId },
    { status: CONVERSATION_STATUS.CLOSED },
    {
      runValidators: true,
      session: options.session,
    }
  );

  return Conversation.find({ orderId }).session(options.session ?? null);
};

const closeConversationForOrder = async (
  orderId: string | Types.ObjectId,
  chatType: ConversationType = CONVERSATION_TYPE.BUYER_SELLER,
  options: SessionOption = {}
) => {
  validateObjectId(orderId, 'order');

  return Conversation.findOneAndUpdate(
    { orderId, chatType },
    { status: CONVERSATION_STATUS.CLOSED },
    {
      new: true,
      runValidators: true,
      session: options.session,
    }
  );
};

const assertOrderHasConversation = async (orderId: string | Types.ObjectId, options: SessionOption = {}) => {
  validateObjectId(orderId, 'order');

  const [order, conversation] = await Promise.all([
    Order.exists({ _id: orderId }).session(options.session ?? null),
    Conversation.exists({ orderId, chatType: CONVERSATION_TYPE.BUYER_SELLER }).session(options.session ?? null),
  ]);

  if (!order) {
    throw new AppError(404, 'Order not found');
  }

  if (!conversation) {
    throw new AppError(500, 'Order conversation has not been created');
  }
};

export const MessagingService = {
  createOrderConversation,
  getOrCreateOrderConversation,
  getOrCreateSellerDeliveryConversation,
  assertOrderChatAccess,
  createMessage,
  getConversationUnreadCount,
  getOrderChat,
  getConversationByOrder,
  getMyConversations,
  getMessages,
  markMessagesSeen,
  markOrderChatSeen,
  closeConversationsForOrder,
  closeConversationForOrder,
  assertOrderHasConversation,
};
