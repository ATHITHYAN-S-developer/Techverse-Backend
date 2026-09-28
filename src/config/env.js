import dotenv from "dotenv";
import os from "os";
dotenv.config();

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const defaultConcurrency = Math.max(2, os.cpus().length * 2);

export const ENV = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGO_URI: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/techverse",
  JWT_SECRET: process.env.JWT_SECRET || "techverse_default_jwt_secret_key",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  CODE_RUN_MAX_CONCURRENCY: parsePositiveInt(process.env.CODE_RUN_MAX_CONCURRENCY, defaultConcurrency),
  CODE_RUN_MAX_QUEUE_WAIT_MS: parsePositiveInt(process.env.CODE_RUN_MAX_QUEUE_WAIT_MS, 8000),
};
