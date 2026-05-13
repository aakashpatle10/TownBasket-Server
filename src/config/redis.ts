import { createClient, RedisClientType } from "redis";
import config from "./environment.js";

const client: RedisClientType = createClient({
  password: config.redis.password,
  socket: {
    host: config.redis.host,
    port: config.redis.port,
  },
});

client.on("error", (err: Error) => {
  console.error("Redis connection error:", err.message);
});

client.on("connect", () => {
  console.log("Redis connected successfully");
});

export async function connectRedis(): Promise<void> {
  try {
    if (!client.isOpen) {
      await client.connect();
    }
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    process.exit(1);
  }
}

export const redisClient = client;
