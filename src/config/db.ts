import mongoose from "mongoose";
import config from "./environment.js";

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(config.database.url, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}
