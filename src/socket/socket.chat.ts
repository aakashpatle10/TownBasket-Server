import type { Server } from 'socket.io';
import mongoose from 'mongoose';
import { CONVERSATION_TYPE, ConversationType } from '../modules/messaging/messaging.interface.js';
import { MessagingService } from '../modules/messaging/messaging.service.js';
import { AppError } from '../utils/AppError.js';
import { SOCKET_ROOMS } from './socket.rooms.js';
import type {
  AuthenticatedSocket,
  ChatJoinRoomPayload,
  ChatMessagePayload,
  ChatSeenPayload,
  ChatTypingPayload,
  SocketAck,
} from './socket.types.js';

const CHAT_EVENTS = {
  NEW_MESSAGE: 'NEW_MESSAGE',
  MESSAGE_SEEN: 'MESSAGE_SEEN',
  USER_TYPING: 'USER_TYPING',
  ROOM_JOINED: 'chat:room-joined',
  MESSAGE: 'chat:message',
  TYPING: 'chat:typing',
  SEEN: 'chat:seen',
  UNREAD_COUNT: 'chat:unread-count',
  STATUS: 'chat:status',
} as const;

const respondWithError = (ack: ((response: SocketAck) => void) | undefined, error: unknown) => {
  if (!ack) {
    return;
  }

  if (error instanceof AppError) {
    ack({
      success: false,
      message: error.message,
    });
    return;
  }

  ack({
    success: false,
    message: 'Something went wrong',
  });
};

const validateOrderId = (orderId: string) => {
  if (!mongoose.isValidObjectId(orderId)) {
    throw new AppError(400, 'Invalid order id');
  }
};

const validateUserId = (userId: string, label: string) => {
  if (!mongoose.isValidObjectId(userId)) {
    throw new AppError(400, `Invalid ${label} id`);
  }
};

const getChatType = (chatType?: ConversationType): ConversationType => {
  return chatType ?? CONVERSATION_TYPE.BUYER_SELLER;
};

const emitUnreadCount = async (
  socket: AuthenticatedSocket,
  orderId: string,
  chatType: ConversationType,
  conversationId: string,
  userId: string
) => {
  const unreadCount = await MessagingService.getConversationUnreadCount(conversationId, userId);

  socket.nsp.to(SOCKET_ROOMS.user(userId)).emit(CHAT_EVENTS.UNREAD_COUNT, {
    orderId,
    chatType,
    conversationId,
    unreadCount,
  });
};

const emitToChatRoom = (
  socket: AuthenticatedSocket,
  orderId: string,
  chatType: ConversationType,
  event: string,
  payload: unknown
) => {
  socket.nsp.to(SOCKET_ROOMS.orderChat(orderId, chatType)).emit(event, payload);
};

const handleJoinOrderRoom = async (
  socket: AuthenticatedSocket,
  payload: ChatJoinRoomPayload,
  ack?: (response: SocketAck) => void
) => {
  try {
    validateOrderId(payload.orderId);
    const chatType = getChatType(payload.chatType);

    const { conversation, isChatActive } = await MessagingService.assertOrderChatAccess(
      payload.orderId,
      socket.data.user.userId,
      chatType
    );

    if (!isChatActive) {
      throw new AppError(400, 'Chat is closed for this order');
    }

    await socket.join(SOCKET_ROOMS.orderChat(payload.orderId, chatType));

    const responsePayload = {
      orderId: payload.orderId,
      chatType,
      conversationId: conversation.id,
      status: conversation.status,
      isChatActive,
    };

    socket.emit(CHAT_EVENTS.ROOM_JOINED, responsePayload);
    ack?.({
      success: true,
      data: responsePayload,
    });

    await emitUnreadCount(socket, payload.orderId, chatType, conversation.id, socket.data.user.userId);
  } catch (error) {
    respondWithError(ack, error);
  }
};

const handleLeaveOrderRoom = async (
  socket: AuthenticatedSocket,
  payload: ChatJoinRoomPayload,
  ack?: (response: SocketAck) => void
) => {
  try {
    validateOrderId(payload.orderId);
    await socket.leave(SOCKET_ROOMS.orderChat(payload.orderId, getChatType(payload.chatType)));

    ack?.({
      success: true,
    });
  } catch (error) {
    respondWithError(ack, error);
  }
};

const handleSendMessage = async (
  socket: AuthenticatedSocket,
  payload: ChatMessagePayload,
  ack?: (response: SocketAck) => void
) => {
  try {
    validateOrderId(payload.orderId);
    const chatType = getChatType(payload.chatType);
    validateUserId(payload.receiverId, 'receiver');

    const trimmedMessage = payload.message.trim();
    if (!trimmedMessage) {
      throw new AppError(400, 'Message is required');
    }

    const { conversation, isChatActive } = await MessagingService.assertOrderChatAccess(
      payload.orderId,
      socket.data.user.userId,
      chatType
    );

    if (!isChatActive) {
      throw new AppError(400, 'Chat is closed for this order');
    }

    const message = await MessagingService.createMessage({
      conversationId: conversation.id,
      senderId: socket.data.user.userId,
      receiverId: payload.receiverId,
      message: trimmedMessage,
    });

    const messagePayload = {
      orderId: payload.orderId,
      chatType,
      conversationId: conversation.id,
      messageId: message.id,
      senderId: message.senderId.toString(),
      receiverId: message.receiverId.toString(),
      message: message.message,
      messageType: message.messageType,
      seenBy: message.seenBy.map((entry) => entry.toString()),
      createdAt: message.createdAt,
    };

    emitToChatRoom(socket, payload.orderId, chatType, CHAT_EVENTS.NEW_MESSAGE, messagePayload);
    emitToChatRoom(socket, payload.orderId, chatType, CHAT_EVENTS.MESSAGE, messagePayload);
    await Promise.all([
      emitUnreadCount(socket, payload.orderId, chatType, conversation.id, payload.receiverId),
      emitUnreadCount(socket, payload.orderId, chatType, conversation.id, socket.data.user.userId),
    ]);

    ack?.({
      success: true,
      data: messagePayload,
    });
  } catch (error) {
    respondWithError(ack, error);
  }
};

const handleTyping = async (socket: AuthenticatedSocket, payload: ChatTypingPayload) => {
  try {
    validateOrderId(payload.orderId);
    const chatType = getChatType(payload.chatType);

    const { conversation, isChatActive } = await MessagingService.assertOrderChatAccess(
      payload.orderId,
      socket.data.user.userId,
      chatType
    );

    if (!isChatActive) {
      return;
    }

    const typingPayload = {
      orderId: payload.orderId,
      chatType,
      conversationId: conversation.id,
      userId: socket.data.user.userId,
      isTyping: payload.isTyping,
    };

    socket.to(SOCKET_ROOMS.orderChat(payload.orderId, chatType)).emit(CHAT_EVENTS.USER_TYPING, typingPayload);
    socket.to(SOCKET_ROOMS.orderChat(payload.orderId, chatType)).emit(CHAT_EVENTS.TYPING, typingPayload);
  } catch (_error) {
    // Ignore transient typing errors to keep the socket session healthy.
  }
};

const handleMarkSeen = async (
  socket: AuthenticatedSocket,
  payload: ChatSeenPayload,
  ack?: (response: SocketAck) => void
) => {
  try {
    validateOrderId(payload.orderId);
    const chatType = getChatType(payload.chatType);

    const { conversation } = await MessagingService.assertOrderChatAccess(
      payload.orderId,
      socket.data.user.userId,
      chatType
    );
    await MessagingService.markMessagesSeen(conversation.id, socket.data.user.userId);

    const seenPayload = {
      orderId: payload.orderId,
      chatType,
      conversationId: conversation.id,
      userId: socket.data.user.userId,
      seenAt: new Date(),
    };

    emitToChatRoom(socket, payload.orderId, chatType, CHAT_EVENTS.MESSAGE_SEEN, seenPayload);
    emitToChatRoom(socket, payload.orderId, chatType, CHAT_EVENTS.SEEN, seenPayload);
    await emitUnreadCount(socket, payload.orderId, chatType, conversation.id, socket.data.user.userId);

    ack?.({
      success: true,
      data: seenPayload,
    });
  } catch (error) {
    respondWithError(ack, error);
  }
};

export const registerChatSocketHandlers = (socket: AuthenticatedSocket) => {
  socket.removeAllListeners('chat:join-order');
  socket.removeAllListeners('chat:leave-order');
  socket.removeAllListeners('chat:send-message');
  socket.removeAllListeners('chat:typing');
  socket.removeAllListeners('chat:mark-seen');

  socket.on('chat:join-order', (payload, ack) => {
    void handleJoinOrderRoom(socket, payload, ack);
  });

  socket.on('chat:leave-order', (payload, ack) => {
    void handleLeaveOrderRoom(socket, payload, ack);
  });

  socket.on('chat:send-message', (payload, ack) => {
    void handleSendMessage(socket, payload, ack);
  });

  socket.on('chat:typing', (payload) => {
    void handleTyping(socket, payload);
  });

  socket.on('chat:mark-seen', (payload, ack) => {
    void handleMarkSeen(socket, payload, ack);
  });
};

export const emitOrderChatStatus = (
  io: Server,
  orderId: string,
  chatType: ConversationType,
  conversationId: string,
  status: string,
  isChatActive: boolean
) => {
  io.to(SOCKET_ROOMS.orderChat(orderId, chatType)).emit(CHAT_EVENTS.STATUS, {
    orderId,
    chatType,
    conversationId,
    status,
    isChatActive,
  });
};
