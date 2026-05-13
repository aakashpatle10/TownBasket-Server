import { Types } from 'mongoose';

export const CHATBOT_ISSUE_PRIORITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
} as const;

export const CHATBOT_TICKET_STATUS = {
  PENDING_REVIEW: 'Pending Review',
  RESOLVED: 'Resolved',
} as const;

export type ChatbotIssuePriority =
  (typeof CHATBOT_ISSUE_PRIORITY)[keyof typeof CHATBOT_ISSUE_PRIORITY];

export type ChatbotTicketStatus =
  (typeof CHATBOT_TICKET_STATUS)[keyof typeof CHATBOT_TICKET_STATUS];

export type ChatbotHistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatbotMessagePayload = {
  message: string;
  history?: ChatbotHistoryMessage[];
  userRole?: 'buyer' | 'seller';
  orderId?: string;
  contactEmail?: string;
  contactPhone?: string;
};

export type ChatbotAiResponse = {
  reply: string;
  issueType: string;
  priority: ChatbotIssuePriority;
  needsEscalation: boolean;
};

export interface IChatbotTicket {
  issueType: string;
  priority: ChatbotIssuePriority;
  status: ChatbotTicketStatus;
  summary: string;
  customerMessage: string;
  user?: Types.ObjectId;
  userRole?: 'buyer' | 'seller';
  orderId?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
