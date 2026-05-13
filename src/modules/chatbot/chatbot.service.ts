import {
  CHATBOT_ISSUE_PRIORITY,
  CHATBOT_TICKET_STATUS,
  ChatbotMessagePayload,
} from './chatbot.interface.js';
import { generateChatbotAiResponse } from './chatbot.ai.js';
import { ChatbotTicket } from './chatbot.model.js';

const ESCALATION_PATTERN =
  /\b(this did(?:n'?t| not) help|problem still exists|talk to human|not solved|need support agent|issue is still|still unresolved|still not solved|customer care|human agent)\b/i;

const ECOMMERCE_PATTERN =
  /\b(order|track|tracking|delivery|deliver|shipment|courier|refund|return|replace|cancel|payment|paid|deducted|wallet|coupon|promo|product|item|damaged|wrong|seller|shop|inventory|stock|payout|upload|verification|verified|rejected|suspension|blocked|login|account|cart|checkout|invoice|cod|cash on delivery|quick commerce|ecommerce|platform)\b/i;

const GREETING_PATTERN = /^(hi|hello|hey|namaste|help|support)$/i;

const ISSUE_RULES: Array<{
  issueType: string;
  priority: (typeof CHATBOT_ISSUE_PRIORITY)[keyof typeof CHATBOT_ISSUE_PRIORITY];
  pattern: RegExp;
}> = [
  {
    issueType: 'Payment Failure',
    priority: CHATBOT_ISSUE_PRIORITY.HIGH,
    pattern: /\b(payment failed|paid|deducted|transaction|upi|card|bank|order failed)\b/i,
  },
  {
    issueType: 'Refund Status',
    priority: CHATBOT_ISSUE_PRIORITY.HIGH,
    pattern: /\b(refund|money back|refunded)\b/i,
  },
  {
    issueType: 'Account Login Problem',
    priority: CHATBOT_ISSUE_PRIORITY.HIGH,
    pattern: /\b(login|otp|password|account blocked|blocked account|unable to access|suspension|suspended)\b/i,
  },
  {
    issueType: 'Delivery Delay',
    priority: CHATBOT_ISSUE_PRIORITY.MEDIUM,
    pattern: /\b(delivery delay|late|not delivered|courier|shipment|out for delivery|delayed)\b/i,
  },
  {
    issueType: 'Product Damaged',
    priority: CHATBOT_ISSUE_PRIORITY.MEDIUM,
    pattern: /\b(damaged|broken|defective|leaking|expired)\b/i,
  },
  {
    issueType: 'Wrong Item Delivered',
    priority: CHATBOT_ISSUE_PRIORITY.MEDIUM,
    pattern: /\b(wrong item|wrong product|missing item|different item)\b/i,
  },
  {
    issueType: 'Return Request',
    priority: CHATBOT_ISSUE_PRIORITY.MEDIUM,
    pattern: /\b(return|replace|replacement)\b/i,
  },
  {
    issueType: 'Cancel Order',
    priority: CHATBOT_ISSUE_PRIORITY.LOW,
    pattern: /\b(cancel|cancellation)\b/i,
  },
  {
    issueType: 'Order Tracking',
    priority: CHATBOT_ISSUE_PRIORITY.LOW,
    pattern: /\b(track|tracking|where is my order|order status)\b/i,
  },
  {
    issueType: 'Coupon Issue',
    priority: CHATBOT_ISSUE_PRIORITY.LOW,
    pattern: /\b(coupon|promo|discount|voucher)\b/i,
  },
  {
    issueType: 'Wallet Issue',
    priority: CHATBOT_ISSUE_PRIORITY.HIGH,
    pattern: /\b(wallet|cashback|balance)\b/i,
  },
  {
    issueType: 'Product Upload Issue',
    priority: CHATBOT_ISSUE_PRIORITY.LOW,
    pattern: /\b(product upload|upload product|catalog|listing)\b/i,
  },
  {
    issueType: 'Inventory Issue',
    priority: CHATBOT_ISSUE_PRIORITY.LOW,
    pattern: /\b(inventory|stock|out of stock)\b/i,
  },
  {
    issueType: 'Payout Delay',
    priority: CHATBOT_ISSUE_PRIORITY.HIGH,
    pattern: /\b(payout|settlement|seller payment)\b/i,
  },
  {
    issueType: 'Shop Verification',
    priority: CHATBOT_ISSUE_PRIORITY.LOW,
    pattern: /\b(shop verification|verify shop|kyc|document verification)\b/i,
  },
  {
    issueType: 'Product Rejection',
    priority: CHATBOT_ISSUE_PRIORITY.LOW,
    pattern: /\b(product rejected|listing rejected|rejection)\b/i,
  },
  {
    issueType: 'Analytics Confusion',
    priority: CHATBOT_ISSUE_PRIORITY.LOW,
    pattern: /\b(analytics|dashboard|sales report|report)\b/i,
  },
];

const cleanMessage = (message: string): string => message.trim().replace(/\s+/g, ' ');

const getConversationText = (payload: ChatbotMessagePayload): string => {
  const historyText = payload.history
    ?.map((item) => `${item.role}: ${item.content}`)
    .join(' ') ?? '';

  return `${historyText} ${payload.message}`;
};

const getCustomerProblemText = (payload: ChatbotMessagePayload): string => {
  const userHistory = payload.history
    ?.filter((item) => item.role === 'user')
    .map((item) => item.content)
    .join(' ') ?? '';

  return cleanMessage(`${userHistory} ${payload.message}`).slice(0, 2000);
};

const detectIssue = (text: string) => {
  const match = ISSUE_RULES.find((rule) => rule.pattern.test(text));

  return match ?? {
    issueType: 'General Ecommerce Support',
    priority: CHATBOT_ISSUE_PRIORITY.LOW,
  };
};

const isInSupportDomain = (message: string): boolean => {
  const normalized = cleanMessage(message);

  return ECOMMERCE_PATTERN.test(normalized) || GREETING_PATTERN.test(normalized);
};

const isConversationInSupportDomain = (payload: ChatbotMessagePayload): boolean => {
  const conversationText = getConversationText(payload);

  return isInSupportDomain(payload.message) || ECOMMERCE_PATTERN.test(conversationText);
};

const getFallbackReply = (issueType: string): string => {
  const replies: Record<string, string> = {
    'Payment Failure':
      'It seems your payment was processed but the order was not confirmed.\n\nRecommended steps:\n- Wait 10-15 minutes and refresh your orders page\n- Check bank or wallet transaction status\n- If no order appears, the amount is usually auto-refunded',
    'Refund Status':
      'I can help you check the refund status.\n\nRecommended steps:\n- Open Orders and select the returned/cancelled order\n- Check Refund Details and bank timeline\n- Refunds may take 3-7 working days depending on payment method',
    'Delivery Delay':
      'Sorry for the delivery delay.\n\nRecommended steps:\n- Check live tracking from My Orders\n- Confirm your delivery address and phone are reachable\n- If the promised time has passed, we can escalate it to support',
    'Product Damaged':
      'Sorry about the damaged product.\n\nRecommended steps:\n- Open the order and choose Return/Replace\n- Upload clear product and package photos\n- Keep the item and packaging until pickup is completed',
    'Wrong Item Delivered':
      'Sorry, it looks like the wrong item may have been delivered.\n\nRecommended steps:\n- Open the order and select Wrong Item Delivered\n- Upload item and invoice photos\n- Request replacement or refund from the order page',
    'Return Request':
      'You can start a return from the order details page.\n\nRecommended steps:\n- Select the item and choose Return/Replace\n- Add the reason and photos if needed\n- Keep the product ready for pickup',
    'Cancel Order':
      'You can cancel the order if it has not been packed or shipped yet.\n\nRecommended steps:\n- Open My Orders and select the order\n- Tap Cancel Order and choose a reason\n- Any eligible refund will be processed automatically',
    'Order Tracking':
      'You can track your order from the app.\n\nRecommended steps:\n- Go to My Orders and open the order\n- Check live delivery status and ETA\n- Refresh once if the status has not updated',
    'Coupon Issue':
      'Coupon issues usually happen due to eligibility or expiry.\n\nRecommended steps:\n- Check minimum order value and valid categories\n- Confirm the coupon has not expired\n- Try removing wallet offers that cannot be combined',
    'Wallet Issue':
      'I can help with wallet balance or cashback issues.\n\nRecommended steps:\n- Refresh Wallet and check transaction history\n- Confirm the offer eligibility and credit date\n- If money is missing, share the transaction reference with support',
    'Account Login Problem':
      'Sorry you are facing account access trouble.\n\nRecommended steps:\n- Request a fresh OTP and check network/SMS permissions\n- Try the registered phone or email\n- If your account is blocked, support will need to review it',
  };

  return replies[issueType] ??
    'I can help with orders, delivery, returns, refunds, payments, accounts, seller, inventory, and platform issues.\n\nPlease share the issue type and any order or shop details so I can guide you.';
};

const getRedirectReply = () =>
  'I can help only with ecommerce platform support.\n\nPlease ask about orders, delivery, refunds, returns, payments, account access, seller tools, inventory, coupons, wallet, or shipments.';

const getTicketSummary = (issueType: string, message: string): string => {
  const detail = cleanMessage(message).slice(0, 180);
  return `${issueType}: ${detail}`;
};

const getEscalationReply = (issueType: string, priority: string) =>
  `We're sorry that your issue is still unresolved.\n\nI have generated a support request for your issue. Our customer care team will review it and contact you within 24 hours.\n\nSupport Ticket Summary:\n- Issue Type: ${issueType}\n- Priority: ${priority}\n- Ticket Status: Pending Review\n\nPlease keep checking your app notifications and email for updates.`;

const createSupportTicket = async (
  payload: ChatbotMessagePayload,
  issueType: string,
  priority: (typeof CHATBOT_ISSUE_PRIORITY)[keyof typeof CHATBOT_ISSUE_PRIORITY]
) => {
  const customerProblemText = getCustomerProblemText(payload);

  return ChatbotTicket.create({
    issueType,
    priority,
    status: CHATBOT_TICKET_STATUS.PENDING_REVIEW,
    summary: getTicketSummary(issueType, customerProblemText),
    customerMessage: customerProblemText,
    userRole: payload.userRole,
    orderId: payload.orderId,
    contactEmail: payload.contactEmail,
    contactPhone: payload.contactPhone,
  });
};

const sendMessage = async (payload: ChatbotMessagePayload) => {
  const conversationText = getConversationText(payload);
  const detected = detectIssue(conversationText);
  const shouldEscalate = ESCALATION_PATTERN.test(payload.message);
  const isSupportDomain = isConversationInSupportDomain(payload);

  if (!isSupportDomain) {
    return {
      reply: getRedirectReply(),
      issueType: 'Unsupported Topic',
      priority: CHATBOT_ISSUE_PRIORITY.LOW,
      escalated: false,
      provider: 'rules',
    };
  }

  if (shouldEscalate) {
    const ticket = await createSupportTicket(payload, detected.issueType, detected.priority);

    return {
      reply: getEscalationReply(detected.issueType, detected.priority),
      issueType: detected.issueType,
      priority: detected.priority,
      escalated: true,
      ticket: {
        id: ticket._id,
        status: ticket.status,
        summary: ticket.summary,
      },
      provider: 'rules',
    };
  }

  const aiResponse = await generateChatbotAiResponse(
    payload.message,
    payload.history,
    payload.userRole
  );

  if (aiResponse) {
    const issueType = aiResponse.issueType || detected.issueType;
    const priority =
      detected.issueType === 'General Ecommerce Support' ? aiResponse.priority : detected.priority;

    if (aiResponse.needsEscalation) {
      const ticket = await createSupportTicket(payload, issueType, priority);

      return {
        reply: getEscalationReply(issueType, priority),
        issueType,
        priority,
        escalated: true,
        ticket: {
          id: ticket._id,
          status: ticket.status,
          summary: ticket.summary,
        },
        provider: 'groq',
      };
    }

    return {
      reply: aiResponse.reply,
      issueType,
      priority,
      escalated: false,
      provider: 'groq',
    };
  }

  return {
    reply: getFallbackReply(detected.issueType),
    issueType: detected.issueType,
    priority: detected.priority,
    escalated: false,
    provider: 'rules',
  };
};

export const ChatbotService = {
  sendMessage,
};
