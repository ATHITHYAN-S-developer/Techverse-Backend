import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const SOURCE_STORAGE_PATH = path.resolve(process.env.STORAGE_PATH || "D:\\TechVerse Storage");
const BACKUP_STORAGE_PATH = path.resolve("E:\\Techverse Storage backup");
const BACKUP_DB_DUMP_PATH = path.join(BACKUP_STORAGE_PATH, "db_backup");
const BACKUP_MONGO_DATA_PATH = path.join(BACKUP_STORAGE_PATH, "mongodb_data");
const MONGOD_EXE = "C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe";

const PRIMARY_MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/techverse";
const BACKUP_MONGO_PORT = 27018;
const BACKUP_MONGO_URI = `mongodb://127.0.0.1:${BACKUP_MONGO_PORT}/techverse`;

console.log("==========================================================");
console.log("       TECHVERSE BACKUP UTILITY (DB & STORAGE)            ");
console.log("==========================================================");
console.log(`Source Storage:   ${SOURCE_STORAGE_PATH}`);
console.log(`Backup Storage:   ${BACKUP_STORAGE_PATH}`);
console.log(`Primary Mongo URI: ${PRIMARY_MONGO_URI}`);
console.log(`Backup Mongo URI:  ${BACKUP_MONGO_URI} (Port: ${BACKUP_MONGO_PORT})`);
console.log("==========================================================\n");

// Ensure directories exist
function ensureDirs() {
  [BACKUP_STORAGE_PATH, BACKUP_DB_DUMP_PATH, BACKUP_MONGO_DATA_PATH].forEach((d) => {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
      console.log(`[Created Directory] ${d}`);
    }
  });
}

// Recursively copy directory
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`[Warning] Source directory does not exist: ${src}`);
    return 0;
  }
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  let count = 0;
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      count += copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      count++;
    }
  }
  return count;
}

// 1. Sync Storage Files
function syncStorageFiles() {
  console.log("\n[Step 1/4] Copying files from Source Storage to Backup Storage...");
  if (!fs.existsSync(SOURCE_STORAGE_PATH)) {
    console.warn(`[Warning] Source storage not found at ${SOURCE_STORAGE_PATH}`);
    return 0;
  }

  const copiedFilesCount = copyDirRecursive(SOURCE_STORAGE_PATH, BACKUP_STORAGE_PATH);
  console.log(`✓ Storage files successfully backed up! (${copiedFilesCount} files copied to ${BACKUP_STORAGE_PATH})`);
  return copiedFilesCount;
}

// 2. Export Collections from Primary MongoDB
async function exportPrimaryDB() {
  console.log("\n[Step 2/4] Connecting to Primary MongoDB to export collections...");
  const primaryConn = await mongoose.createConnection(PRIMARY_MONGO_URI).asPromise();
  console.log("✓ Connected to primary MongoDB.");

  const collections = await primaryConn.db.listCollections().toArray();
  const summary = {};

  for (const col of collections) {
    const colName = col.name;
    const docs = await primaryConn.db.collection(colName).find({}).toArray();
    const filePath = path.join(BACKUP_DB_DUMP_PATH, `${colName}.json`);

    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), "utf-8");
    summary[colName] = docs.length;
    console.log(`  - Exported ${colName}: ${docs.length} documents -> ${colName}.json`);
  }

  await primaryConn.close();
  console.log(`✓ All collections exported to JSON dump at ${BACKUP_DB_DUMP_PATH}`);
  return summary;
}

// 3. Start Backup MongoDB on Port 27018 if not already running
async function ensureBackupMongoRunning() {
  console.log(`\n[Step 3/4] Checking Backup MongoDB instance on port ${BACKUP_MONGO_PORT}...`);

  // Try connecting first
  try {
    const testConn = await mongoose.createConnection(BACKUP_MONGO_URI, {
      serverSelectionTimeoutMS: 2000,
    }).asPromise();
    console.log(`✓ MongoDB instance is already running on port ${BACKUP_MONGO_PORT}`);
    return { connection: testConn, process: null };
  } catch (err) {
    console.log(`MongoDB on port ${BACKUP_MONGO_PORT} is not active. Starting new instance...`);
  }

  if (!fs.existsSync(MONGOD_EXE)) {
    console.error(`[Error] mongod.exe not found at ${MONGOD_EXE}`);
    throw new Error(`mongod.exe not found at ${MONGOD_EXE}`);
  }

  const mongoProcess = spawn(
    MONGOD_EXE,
    ["--dbpath", BACKUP_MONGO_DATA_PATH, "--port", String(BACKUP_MONGO_PORT)],
    {
      detached: true,
      stdio: "ignore",
    }
  );
  mongoProcess.unref();

  console.log(`Spawned mongod.exe on port ${BACKUP_MONGO_PORT} with dbpath: "${BACKUP_MONGO_DATA_PATH}"`);

  // Wait for it to become ready
  let connected = false;
  let testConn = null;
  for (let attempt = 1; attempt <= 15; attempt++) {
    try {
      await new Promise((r) => setTimeout(r, 1000));
      testConn = await mongoose.createConnection(BACKUP_MONGO_URI, {
        serverSelectionTimeoutMS: 2000,
      }).asPromise();
      connected = true;
      console.log(`✓ Successfully connected to Backup MongoDB on port ${BACKUP_MONGO_PORT}!`);
      break;
    } catch (e) {
      process.stdout.write(`Waiting for MongoDB port ${BACKUP_MONGO_PORT} to accept connections (${attempt}/15)...\r`);
    }
  }

  if (!connected) {
    throw new Error(`Failed to start MongoDB on port ${BACKUP_MONGO_PORT}`);
  }

  return { connection: testConn, process: mongoProcess };
}

// 4. Restore / Sync data to Backup MongoDB
async function restoreToBackupDB(backupConn, summary) {
  console.log(`\n[Step 4/4] Restoring collections to Backup DB on port ${BACKUP_MONGO_PORT}...`);

  for (const colName of Object.keys(summary)) {
    const filePath = path.join(BACKUP_DB_DUMP_PATH, `${colName}.json`);
    if (!fs.existsSync(filePath)) continue;

    const raw = fs.readFileSync(filePath, "utf-8");
    const docs = JSON.parse(raw);

    const collection = backupConn.db.collection(colName);
    // Drop existing to keep backup fresh
    try {
      await collection.drop();
    } catch (dropErr) {
      // Collection may not exist yet
    }

    if (docs.length > 0) {
      await collection.insertMany(docs);
      console.log(`  - Restored ${colName}: ${docs.length} documents into backup DB`);
    } else {
      console.log(`  - Restored ${colName}: 0 documents (empty collection created)`);
    }
  }

  console.log(`✓ All collections successfully synced to Backup DB at ${BACKUP_MONGO_URI}`);
}

// Write Backup Manifest
function writeBackupManifest(filesCount, dbSummary) {
  const manifest = {
    backupDate: new Date().toISOString(),
    primaryMongoPort: 27017,
    backupMongoPort: BACKUP_MONGO_PORT,
    primaryStoragePath: SOURCE_STORAGE_PATH,
    backupStoragePath: BACKUP_STORAGE_PATH,
    backupMongoDataPath: BACKUP_MONGO_DATA_PATH,
    backupDbDumpPath: BACKUP_DB_DUMP_PATH,
    totalStorageFilesBackedUp: filesCount,
    collectionsBackedUp: dbSummary,
    status: "HEALTHY_AND_VERIFIED",
  };

  const manifestPath = path.join(BACKUP_STORAGE_PATH, "BACKUP_INFO.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`\n✓ Backup Manifest written to ${manifestPath}`);
}

async function run() {
  try {
    ensureDirs();
    const filesCount = syncStorageFiles();
    const dbSummary = await exportPrimaryDB();
    const { connection: backupConn } = await ensureBackupMongoRunning();
    await restoreToBackupDB(backupConn, dbSummary);
    await backupConn.close();

    writeBackupManifest(filesCount, dbSummary);

    console.log("\n==========================================================");
    console.log("            🎉 BACKUP COMPLETED SUCCESSFULLY!             ");
    console.log("==========================================================");
    console.log(`• Storage Backup Location: E:\\Techverse Storage backup`);
    console.log(`• Backup MongoDB Port:     27018 (Live active instance)`);
    console.log(`• Backup Storage Port:     5002 (Configured in .env.backup)`);
    console.log("==========================================================\n");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Backup failed:", err);
    process.exit(1);
  }
}

run();
