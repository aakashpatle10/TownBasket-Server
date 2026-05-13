import config from '../../config/environment.js';

type GroqChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const AI_TIMEOUT_MS = 2500;

const extractJsonArray = (value: string): string[] => {
  const start = value.indexOf('[');
  const end = value.lastIndexOf(']');

  if (start === -1 || end === -1 || end <= start) {
    return [];
  }

  try {
    const parsed = JSON.parse(value.slice(start, end + 1));
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === 'string');
  } catch (_error) {
    return [];
  }
};

const normalizeCategory = (category: string): string => category.trim().toLowerCase();

export const expandRecommendationCategories = async (
  seedCategories: string[],
  availableCategories: string[]
): Promise<string[]> => {
  const apiKey = config.groq.apiKey;
  const normalizedSeeds = [...new Set(seedCategories.map(normalizeCategory).filter(Boolean))];
  const normalizedAvailable = [...new Set(availableCategories.map(normalizeCategory).filter(Boolean))];

  if (!apiKey || normalizedSeeds.length === 0 || normalizedAvailable.length === 0) {
    return [];
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
        model: config.groq.recommendationModel,
        temperature: 0,
        max_tokens: 120,
        messages: [
          {
            role: 'system',
            content:
              'Return only a JSON array of category strings. Choose only from the available categories. No prose.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              task: 'Expand quick-commerce recommendation category intent.',
              seedCategories: normalizedSeeds,
              availableCategories: normalizedAvailable,
              maxResults: 8,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as GroqChatResponse;
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      return [];
    }

    const availableSet = new Set(normalizedAvailable);
    return extractJsonArray(content)
      .map(normalizeCategory)
      .filter((category) => availableSet.has(category) && !normalizedSeeds.includes(category))
      .slice(0, 8);
  } catch (_error) {
    return [];
  } finally {
    clearTimeout(timeout);
  }
};
