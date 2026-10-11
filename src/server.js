import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { ENV } from "./config/env.js";
import { startStorageServer } from "./storageServer.js";

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    const server = http.createServer(app);
    let storageServerInstance = null;

    // High-concurrency socket tuning (handles 500+ simultaneous connections efficiently)
    server.keepAliveTimeout = 65000; // 65 seconds keep-alive for reusing TCP connections
    server.headersTimeout = 66000;   // Keep slightly higher than keepAliveTimeout
    server.maxHeadersCount = 2000;

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.warn(`⚠️ Port ${ENV.PORT} is busy. Retrying in 1 second...`);
        setTimeout(() => {
          server.close();
          server.listen(ENV.PORT, "0.0.0.0");
        }, 1000);
      } else {
        console.error("❌ Server Error:", error);
      }
    });

    server.listen(ENV.PORT, "0.0.0.0", () => {
      console.log(`====================================================`);
      console.log(`🚀 TechVerse Backend Server running on port ${ENV.PORT}`);
      console.log(`🏛️ Institution: Velalar College of Engineering & Tech`);
      console.log(`📡 Health Check: http://localhost:${ENV.PORT}/api/health`);
      console.log(`⚡ PM2 Cluster Worker Process ID: ${process.pid}`);
      console.log(`====================================================`);

      // Inform PM2 that this instance is completely booted and ready to receive traffic
      // (Crucial for PM2 Zero-Downtime Reload)
      if (process.send) {
        process.send("ready");
      }
    });

    // Auto-start dedicated announcement storage server if configured
    if (ENV.AUTO_START_STORAGE_SERVER) {
      storageServerInstance = startStorageServer(ENV.STORAGE_PORT);
    }

    const shutdown = (signal) => {
      console.log(`🛑 Received ${signal}, initiating graceful shutdown...`);
      if (storageServerInstance) {
        try {
          storageServerInstance.close();
        } catch {}
      }

      // Close HTTP server and stop accepting new connections
      server.close(() => {
        console.log(`🔒 HTTP Server closed on worker ${process.pid}.`);
        if (signal === "SIGUSR2") {
          process.kill(process.pid, "SIGUSR2");
        } else {
          process.exit(0);
        }
      });

      // Force exit if connections take too long to drain
      setTimeout(() => {
        console.warn(`⚠️ Graceful shutdown timed out, force terminating PID ${process.pid}.`);
        process.exit(1);
      }, 4500).unref();
    };

    process.once("SIGUSR2", () => shutdown("SIGUSR2"));
    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
