import path from "path";
import dotenv from "dotenv";

// Pre-configure environment variables for the backup storage instance
process.env.STORAGE_PORT = "5002";
process.env.STORAGE_PATH = path.resolve("E:\\Techverse Storage backup");

dotenv.config();

console.log("====================================================");
console.log("    TECHVERSE BACKUP STORAGE SERVER (PORT 5002)     ");
console.log(`📂 Serving Files from: ${process.env.STORAGE_PATH}`);
console.log("====================================================");

// Import and start storage server on port 5002
import { startStorageServer } from "./storageServer.js";

const BACKUP_PORT = 5002;
startStorageServer(BACKUP_PORT);
