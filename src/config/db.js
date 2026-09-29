import mongoose from "mongoose";
import { ENV } from "./env.js";

export async function connectDB() {
  try {
    console.log(`🔌 Connecting to MongoDB database...`);
    const conn = await mongoose.connect(ENV.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
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
