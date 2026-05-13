import type { Socket } from 'socket.io';
import type { ConversationType } from '../modules/messaging/messaging.interface.js';
import type { AuthJwtPayload } from '../utils/jwtHelpers.js';

export type SocketData = {
  user: AuthJwtPayload;
};

export type ChatJoinRoomPayload = {
  orderId: string;
  chatType?: ConversationType;
};

export type ChatMessagePayload = {
  orderId: string;
  chatType?: ConversationType;
  receiverId: string;
  message: string;
};

export type ChatTypingPayload = {
  orderId: string;
  chatType?: ConversationType;
  isTyping: boolean;
};

export type ChatSeenPayload = {
  orderId: string;
  chatType?: ConversationType;
};

export type ChatMessageEventPayload = {
  orderId: string;
  chatType: ConversationType;
  conversationId: string;
  messageId: string;
  senderId: string;
  receiverId: string;
  message: string;
  messageType: string;
  seenBy: string[];
  createdAt: Date;
};

export type ChatTypingEventPayload = {
  orderId: string;
  chatType: ConversationType;
  conversationId: string;
  userId: string;
  isTyping: boolean;
};

export type ChatSeenEventPayload = {
  orderId: string;
  chatType: ConversationType;
  conversationId: string;
  userId: string;
  seenAt: Date;
};

export type ChatUnreadCountPayload = {
  orderId: string;
  chatType: ConversationType;
  conversationId: string;
  unreadCount: number;
};

export type ChatRoomJoinedPayload = {
  orderId: string;
  chatType: ConversationType;
  conversationId: string;
  status: string;
  isChatActive: boolean;
};

export type ChatStatusPayload = {
  orderId: string;
  chatType: ConversationType;
  conversationId: string;
  status: string;
  isChatActive: boolean;
};

export type SocketAck =
  | {
      success: true;
      data?: unknown;
    }
  | {
      success: false;
      message: string;
    };

export type ServerToClientEvents = Record<string, (payload?: any) => void> & {
  connected: (payload: { socketId: string; userId: string }) => void;
  reconnected: (payload: { socketId: string; userId: string }) => void;
  'presence:update': (payload: unknown) => void;
  NEW_MESSAGE: (payload: ChatMessageEventPayload) => void;
  MESSAGE_SEEN: (payload: ChatSeenEventPayload) => void;
  USER_TYPING: (payload: ChatTypingEventPayload) => void;
  'chat:room-joined': (payload: ChatRoomJoinedPayload) => void;
  'chat:message': (payload: ChatMessageEventPayload) => void;
  'chat:typing': (payload: ChatTypingEventPayload) => void;
  'chat:seen': (payload: ChatSeenEventPayload) => void;
  'chat:unread-count': (payload: ChatUnreadCountPayload) => void;
  'chat:status': (payload: ChatStatusPayload) => void;
};

export type ClientToServerEvents = Record<string, (...args: any[]) => void> & {
  reconnect: () => void;
  'chat:join-order': (payload: ChatJoinRoomPayload, ack?: (response: SocketAck) => void) => void;
  'chat:leave-order': (payload: ChatJoinRoomPayload, ack?: (response: SocketAck) => void) => void;
  'chat:send-message': (payload: ChatMessagePayload, ack?: (response: SocketAck) => void) => void;
  'chat:typing': (payload: ChatTypingPayload) => void;
  'chat:mark-seen': (payload: ChatSeenPayload, ack?: (response: SocketAck) => void) => void;
};

export type InterServerEvents = Record<string, never>;

export type AuthenticatedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
