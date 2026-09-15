import app from "./app.js";
import { connectDB } from "./config/db.js";
import { ENV } from "./config/env.js";

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Express Listener
    app.listen(ENV.PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 TechVerse Backend Server running on port ${ENV.PORT}`);
      console.log(`🏛️ Institution: Velalar College of Engineering & Tech`);
      console.log(`📡 Health Check: http://localhost:${ENV.PORT}/api/health`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
