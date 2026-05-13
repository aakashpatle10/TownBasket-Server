import mongoose, { Schema } from 'mongoose';
import {
  CHATBOT_ISSUE_PRIORITY,
  CHATBOT_TICKET_STATUS,
  IChatbotTicket,
} from './chatbot.interface.js';

const chatbotTicketSchema = new Schema<IChatbotTicket>(
  {
    issueType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    priority: {
      type: String,
      enum: Object.values(CHATBOT_ISSUE_PRIORITY),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(CHATBOT_TICKET_STATUS),
      default: CHATBOT_TICKET_STATUS.PENDING_REVIEW,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    customerMessage: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    userRole: {
      type: String,
      enum: ['buyer', 'seller'],
    },
    orderId: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    contactPhone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
  },
  {
    timestamps: true,
  }
);

chatbotTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });
chatbotTicketSchema.index({ contactEmail: 1, createdAt: -1 });
chatbotTicketSchema.index({ user: 1, createdAt: -1 });

export const ChatbotTicket = mongoose.model<IChatbotTicket>(
  'ChatbotTicket',
  chatbotTicketSchema
);
