import mongoose from "mongoose";
import { ENV } from "./env.js";

export async function connectDB() {
  try {
    console.log(`🔌 Connecting to MongoDB database...`);
    const conn = await mongoose.connect(ENV.MONGO_URI, {
      maxPoolSize: 100, // Scaled for high concurrency (500+ users)
      minPoolSize: 10,  // Pre-warmed sockets to absorb sudden traffic spikes
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    
    mongoose.connection.on("error", (err) => {
      console.error(`⚠️ MongoDB Runtime Error:`, err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn(`⚠️ MongoDB Disconnected`);
    });

    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    return null;
  }
}
