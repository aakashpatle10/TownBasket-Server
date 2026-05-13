import { Types } from 'mongoose';

export const CONVERSATION_PARTICIPANT_ROLE = {
  BUYER: 'buyer',
  SELLER: 'seller',
  DELIVERY_PARTNER: 'delivery_partner',
} as const;

export const CONVERSATION_TYPE = {
  BUYER_SELLER: 'buyer_seller',
  SELLER_DELIVERY: 'seller_delivery',
} as const;

export const CONVERSATION_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
} as const;

export const MESSAGE_TYPE = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  SYSTEM: 'system',
} as const;

export type ConversationParticipantRole =
  (typeof CONVERSATION_PARTICIPANT_ROLE)[keyof typeof CONVERSATION_PARTICIPANT_ROLE];
export type ConversationType = (typeof CONVERSATION_TYPE)[keyof typeof CONVERSATION_TYPE];
export type ConversationStatus = (typeof CONVERSATION_STATUS)[keyof typeof CONVERSATION_STATUS];
export type MessageType = (typeof MESSAGE_TYPE)[keyof typeof MESSAGE_TYPE];

export interface IConversationParticipant {
  userId: Types.ObjectId;
  role: ConversationParticipantRole;
  joinedAt: Date;
}

export interface IConversationLastMessage {
  messageId: Types.ObjectId;
  senderId: Types.ObjectId;
  message: string;
  messageType: MessageType;
  createdAt: Date;
}

export interface IConversation {
  orderId: Types.ObjectId;
  chatType: ConversationType;
  participants: IConversationParticipant[];
  lastMessage?: IConversationLastMessage;
  lastMessageAt?: Date;
  status: ConversationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage {
  conversationId: Types.ObjectId;
  orderId: Types.ObjectId;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  message: string;
  messageType: MessageType;
  seenBy: Types.ObjectId[];
  deletedFor: Types.ObjectId[];
  createdAt: Date;
}
