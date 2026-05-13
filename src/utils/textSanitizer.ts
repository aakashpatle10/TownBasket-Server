export const sanitizeText = (value: unknown, maxLength = 2000): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
};

export const normalizeHashtags = (hashtags: unknown): string[] => {
  const values = Array.isArray(hashtags)
    ? hashtags
    : typeof hashtags === 'string'
      ? hashtags.split(',')
      : [];

  return [...new Set(values
    .map((tag) => sanitizeText(tag, 40).replace(/^#/, '').toLowerCase())
    .filter(Boolean))];
};

export const parseStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string' && Boolean(entry.trim()));
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((entry): entry is string => typeof entry === 'string' && Boolean(entry.trim()));
    }
  } catch (_error) {
    return value.split(',').map((entry) => entry.trim()).filter(Boolean);
  }

  return [];
};

