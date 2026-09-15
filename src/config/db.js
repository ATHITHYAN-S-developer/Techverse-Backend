import mongoose from "mongoose";
import { ENV } from "./env.js";

export async function connectDB() {
  try {
    const conn = await mongoose.connect(ENV.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Don't exit process in development if Mongo is temporarily offline, to allow graceful fallback/retries
    return null;
  }
}
