import dotenv from "dotenv";
import type { SignOptions } from "jsonwebtoken";
import { fi } from "zod/locales";

dotenv.config();

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseNumber(process.env.PORT, 5000),
  database: {
    url: process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/quick-commerce",
  },
  redis: {
    host: process.env.REDIS_HOST ?? "127.0.0.1",
    port: parseNumber(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? "change-this-access-secret",
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? "change-this-refresh-secret",
    accessExpiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ??
      process.env.JWT_EXPIRES_IN ??
      "15m") as SignOptions["expiresIn"],
    refreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"],
  },
  bcrypt: {
    saltRounds: parseNumber(process.env.BCRYPT_SALT_ROUNDS, 12),
  },
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(",") ?? ["*"],
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY ?? "",
    recommendationModel: process.env.GROQ_RECOMMENDATION_MODEL ?? "llama-3.1-8b-instant",
    moderationModel: process.env.GROQ_MODERATION_MODEL ?? "llama-3.1-8b-instant",
    chatbotModel: process.env.GROQ_CHATBOT_MODEL ?? "llama-3.1-8b-instant",
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID ?? "",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") ?? "",
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID ?? "",
  },
} as const;

export default config;
