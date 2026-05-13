import config from '../../config/environment.js';
import {
  MODERATION_CATEGORY,
  ModerationCategory,
} from './moderation.interface.js';

type ModerationClassification = {
  categories: ModerationCategory[];
  riskScore: number;
  reasons: string[];
  provider: 'rules' | 'groq' | 'rules+groq';
  raw?: Record<string, unknown>;
};

type GroqChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const AI_TIMEOUT_MS = 2500;

const CATEGORY_VALUES = Object.values(MODERATION_CATEGORY);

const RULES: Array<{
  category: ModerationCategory;
  risk: number;
  reason: string;
  pattern: RegExp;
}> = [
  {
    category: MODERATION_CATEGORY.ABUSE,
    risk: 0.78,
    reason: 'Abusive or threatening language pattern detected',
    pattern: /\b(kill|die|idiot|stupid|bastard|harass|threat|abuse)\b/i,
  },
  {
    category: MODERATION_CATEGORY.SPAM,
    risk: 0.7,
    reason: 'Spam-like promotional pattern detected',
    pattern: /\b(buy now|click here|free money|limited offer|subscribe|promo code|whatsapp me)\b/i,
  },
  {
    category: MODERATION_CATEGORY.SCAM,
    risk: 0.82,
    reason: 'Potential scam or off-platform payment pattern detected',
    pattern: /\b(pay outside|upi only|bank transfer|advance payment|crypto|telegram|password|otp|verification code)\b/i,
  },
  {
    category: MODERATION_CATEGORY.SPAM,
    risk: 0.62,
    reason: 'Repeated URL or contact detail pattern detected',
    pattern: /(https?:\/\/|www\.|(?:\+?\d[\s-]?){8,})/i,
  },
];

const clampRisk = (riskScore: number): number => Math.min(Math.max(riskScore, 0), 1);

const normalizeText = (text: string): string => text.trim().replace(/\s+/g, ' ').slice(0, 5000);

const uniqueCategories = (categories: string[]): ModerationCategory[] => {
  return [...new Set(categories)]
    .filter((category): category is ModerationCategory =>
      CATEGORY_VALUES.includes(category as ModerationCategory)
    );
};

const classifyWithRules = (text: string): ModerationClassification => {
  const normalizedText = normalizeText(text);
  const matchedRules = RULES.filter((rule) => rule.pattern.test(normalizedText));
  const repeatedCharacters = /(.)\1{5,}/.test(normalizedText);

  const categories = uniqueCategories(matchedRules.map((rule) => rule.category));
  const reasons = matchedRules.map((rule) => rule.reason);
  let riskScore = matchedRules.reduce((score, rule) => Math.max(score, rule.risk), 0);

  if (repeatedCharacters) {
    riskScore = Math.max(riskScore, 0.5);
    reasons.push('Repeated-character spam pattern detected');
    if (!categories.includes(MODERATION_CATEGORY.SPAM)) {
      categories.push(MODERATION_CATEGORY.SPAM);
    }
  }

  return {
    categories,
    riskScore: clampRisk(riskScore),
    reasons,
    provider: 'rules',
  };
};

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

const classifyWithGroq = async (text: string): Promise<ModerationClassification | null> => {
  const apiKey = config.groq.apiKey;
  if (!apiKey || !text.trim()) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.groq.moderationModel,
        temperature: 0,
        max_tokens: 180,
        messages: [
          {
            role: 'system',
            content:
              'Classify marketplace content for abuse, spam, and scam. Return only JSON: {"categories":["abuse|spam|scam"],"riskScore":0-1,"reasons":["short reason"]}. Do not recommend bans.',
          },
          {
            role: 'user',
            content: normalizeText(text),
          },
        ],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json() as GroqChatResponse;
    const content = payload.choices?.[0]?.message?.content;
    const parsed = content ? extractJsonObject(content) : null;

    if (!parsed) {
      return null;
    }

    const categories = Array.isArray(parsed.categories)
      ? uniqueCategories(parsed.categories.filter((category): category is string => typeof category === 'string'))
      : [];
    const reasons = Array.isArray(parsed.reasons)
      ? parsed.reasons.filter((reason): reason is string => typeof reason === 'string').slice(0, 5)
      : [];
    const riskScore = typeof parsed.riskScore === 'number' ? parsed.riskScore : 0;

    return {
      categories,
      riskScore: clampRisk(riskScore),
      reasons,
      provider: 'groq',
      raw: parsed,
    };
  } catch (_error) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const mergeClassifications = (
  rules: ModerationClassification,
  ai: ModerationClassification | null
): ModerationClassification => {
  if (!ai) {
    return rules;
  }

  return {
    categories: uniqueCategories([...rules.categories, ...ai.categories]),
    riskScore: clampRisk(Math.max(rules.riskScore, ai.riskScore)),
    reasons: [...new Set([...rules.reasons, ...ai.reasons])].slice(0, 8),
    provider: rules.categories.length > 0 ? 'rules+groq' : 'groq',
    raw: ai.raw,
  };
};

export const classifyModerationText = async (text: string): Promise<ModerationClassification> => {
  const rules = classifyWithRules(text);
  const ai = await classifyWithGroq(text);

  return mergeClassifications(rules, ai);
};
