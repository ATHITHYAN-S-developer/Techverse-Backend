import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { ENV } from "./config/env.js";

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    const server = http.createServer(app);

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
      console.log(`====================================================`);
    });

    process.once("SIGUSR2", () => {
      server.close(() => {
        process.kill(process.pid, "SIGUSR2");
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
