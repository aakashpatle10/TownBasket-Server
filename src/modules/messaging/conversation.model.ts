import mongoose, { Schema } from 'mongoose';
import {
  CONVERSATION_PARTICIPANT_ROLE,
  CONVERSATION_STATUS,
  CONVERSATION_TYPE,
  IConversation,
  MESSAGE_TYPE,
} from './messaging.interface.js';

const participantSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(CONVERSATION_PARTICIPANT_ROLE),
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const lastMessageSchema = new Schema(
  {
    messageId: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    messageType: {
      type: String,
      enum: Object.values(MESSAGE_TYPE),
      required: true,
    },
    createdAt: {
      type: Date,
      required: true,
    },
  },
  {
    _id: false,
  }
);

const conversationSchema = new Schema<IConversation>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      immutable: true,
    },
    chatType: {
      type: String,
      enum: Object.values(CONVERSATION_TYPE),
      default: CONVERSATION_TYPE.BUYER_SELLER,
      required: true,
      immutable: true,
    },
    participants: {
      type: [participantSchema],
      required: true,
      validate: {
        validator(value: IConversation['participants']) {
          return value.length > 0;
        },
        message: 'Conversation must have at least one participant',
      },
    },
    lastMessage: {
      type: lastMessageSchema,
    },
    lastMessageAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(CONVERSATION_STATUS),
      default: CONVERSATION_STATUS.ACTIVE,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ orderId: 1, chatType: 1 }, { unique: true });
conversationSchema.index({ 'participants.userId': 1, lastMessageAt: -1 });
conversationSchema.index({ chatType: 1, status: 1, lastMessageAt: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
