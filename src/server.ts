import { createServer } from "http";
import app from "./app.js";
import config from "./config/environment.js";
import { connectDB } from "./config/db.js";
import { connectRedis } from "./config/redis.js";
import { initializeSocketServer } from "./socket/socket.manager.js";
import { seedRoles } from "./utils/seedRoles.js";

async function startServer(): Promise<void> {
  try {
    await connectDB();
    await seedRoles();
    await connectRedis();

    const httpServer = createServer(app);
    initializeSocketServer(httpServer);

    const server = httpServer;

    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        console.error(
          `Port ${config.port} is already in use. Stop the existing process or set PORT to a different value in .env.`
        );
        process.exit(1);
      }

      console.error("Server failed to start:", error);
      process.exit(1);
    });

    server.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
    });

    const shutdown = async (signal: string): Promise<void> => {
      console.log(`${signal} received. Closing server...`);
      server.close(() => {
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => void shutdown("SIGTERM"));
    process.on("SIGINT", () => void shutdown("SIGINT"));
  } catch (error) {
    console.error("Error starting the server:", error);
    process.exit(1);
  }
}

void startServer();
