import config from '../../config/environment.js';
import {
  CHATBOT_ISSUE_PRIORITY,
  ChatbotAiResponse,
  ChatbotHistoryMessage,
  ChatbotIssuePriority,
} from './chatbot.interface.js';

type GroqChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const AI_TIMEOUT_MS = 4000;
const PRIORITY_VALUES = Object.values(CHATBOT_ISSUE_PRIORITY);

const SYSTEM_PROMPT = `
You are a customer support assistant for an ecommerce and quick commerce platform.
Only answer ecommerce, shopping, delivery, seller, payment, refund, return, order, account, inventory, product, coupon, wallet, shipment, and platform support queries.
Do not answer coding, politics, medical, legal, educational, personal, or unrelated questions.
Keep the reply friendly, professional, practical, and 3 to 6 lines maximum.
If unrelated, politely redirect back to ecommerce support topics.
If escalation is needed, do not invent a ticket id.
Return only JSON with this shape:
{"reply":"short support reply","issueType":"detected issue","priority":"Low|Medium|High","needsEscalation":false}
Priority rules: payment, refund, account blocked or suspension is High; delivery or product issue is Medium; general questions are Low.
`.trim();

const normalizeText = (text: string): string => text.trim().replace(/\s+/g, ' ').slice(0, 2000);

const extractJsonObject = (value: string): Record<string, unknown> | null => {
  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    const parsed = JSON.parse(value.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch (_error) {
    return null;
  }
};

const normalizePriority = (priority: unknown): ChatbotIssuePriority => {
  if (typeof priority === 'string' && PRIORITY_VALUES.includes(priority as ChatbotIssuePriority)) {
    return priority as ChatbotIssuePriority;
  }

  return CHATBOT_ISSUE_PRIORITY.LOW;
};

const parseAiResponse = (content: string): ChatbotAiResponse | null => {
  const parsed = extractJsonObject(content);

  if (!parsed || typeof parsed.reply !== 'string' || typeof parsed.issueType !== 'string') {
    return null;
  }

  return {
    reply: parsed.reply.trim().slice(0, 900),
    issueType: parsed.issueType.trim().slice(0, 80) || 'General Ecommerce Support',
    priority: normalizePriority(parsed.priority),
    needsEscalation: parsed.needsEscalation === true,
  };
};

export const generateChatbotAiResponse = async (
  message: string,
  history: ChatbotHistoryMessage[] = [],
  userRole?: 'buyer' | 'seller'
): Promise<ChatbotAiResponse | null> => {
  const apiKey = config.groq.apiKey;
  const normalizedMessage = normalizeText(message);

  if (!apiKey || !normalizedMessage) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  const recentHistory = history.slice(-6).map((item) => ({
    role: item.role,
    content: normalizeText(item.content),
  }));

  try {
    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.groq.chatbotModel,
        temperature: 0.2,
        max_tokens: 420,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: JSON.stringify({
              userRole,
              history: recentHistory,
              latestMessage: normalizedMessage,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as GroqChatResponse;
    const content = payload.choices?.[0]?.message?.content;

    return content ? parseAiResponse(content) : null;
  } catch (_error) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};
