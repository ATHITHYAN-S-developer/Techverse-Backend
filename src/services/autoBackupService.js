import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import mongoose from "mongoose";
import { ENV } from "../config/env.js";

const SOURCE_STORAGE_PATH = path.resolve(ENV.STORAGE_PATH || "D:\\TechVerse Storage");
const BACKUP_STORAGE_PATH = path.resolve(ENV.BACKUP_STORAGE_PATH || "E:\\Techverse Storage backup");
const BACKUP_DB_DUMP_PATH = path.join(BACKUP_STORAGE_PATH, "db_backup");
const BACKUP_MONGO_DATA_PATH = path.join(BACKUP_STORAGE_PATH, "mongodb_data");
const BACKUP_MONGO_PORT = ENV.BACKUP_MONGO_PORT || 27018;
const PRIMARY_MONGO_URI = ENV.MONGO_URI || "mongodb://127.0.0.1:27017/techverse";
const BACKUP_MONGO_URI = ENV.BACKUP_MONGO_URI || `mongodb://127.0.0.1:${BACKUP_MONGO_PORT}/techverse`;

const MONGOD_POSSIBLE_PATHS = [
  "C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe",
  "C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe",
  "C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe",
  "mongod.exe",
];

let syncIntervalTimer = null;
let storageWatcher = null;
let watcherDebounceTimer = null;
let isSyncInProgress = false;

let backupStatus = {
  enabled: false,
  isSyncing: false,
  lastSyncTime: null,
  lastSyncStatus: "NOT_RUN_YET",
  lastDurationMs: null,
  totalFilesBackedUp: 0,
  collectionsCount: 0,
  lastError: null,
  backupMongoPort: BACKUP_MONGO_PORT,
  backupStoragePath: BACKUP_STORAGE_PATH,
  sourceStoragePath: SOURCE_STORAGE_PATH,
};

/**
 * Ensure required backup directories exist
 */
export function ensureBackupDirectories() {
  [BACKUP_STORAGE_PATH, BACKUP_DB_DUMP_PATH, BACKUP_MONGO_DATA_PATH].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[AutoBackup] Initialized directory: ${dir}`);
      } catch (err) {
        console.error(`[AutoBackup] Failed creating directory ${dir}:`, err.message);
      }
    }
  });
}

/**
 * Finds mongod executable path
 */
function findMongodExe() {
  for (const exePath of MONGOD_POSSIBLE_PATHS) {
    if (fs.existsSync(exePath)) {
      return exePath;
    }
  }
  return "mongod";
}

/**
 * Ensure Backup MongoDB daemon is running on port 27018
 */
export async function ensureBackupMongoDaemon() {
  try {
    const testConn = await mongoose.createConnection(BACKUP_MONGO_URI, {
      serverSelectionTimeoutMS: 2000,
    }).asPromise();
    await testConn.close();
    return true;
  } catch (err) {
    // Port not active, attempt to spawn mongod
  }

  const mongodExe = findMongodExe();
  console.log(`[AutoBackup] Starting Backup MongoDB daemon on port ${BACKUP_MONGO_PORT}...`);

  try {
    const mongoProcess = spawn(
      mongodExe,
      ["--dbpath", BACKUP_MONGO_DATA_PATH, "--port", String(BACKUP_MONGO_PORT)],
      {
        detached: true,
        stdio: "ignore",
      }
    );
    mongoProcess.unref();

    // Poll until connection is established
    for (let i = 1; i <= 10; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const conn = await mongoose.createConnection(BACKUP_MONGO_URI, {
          serverSelectionTimeoutMS: 2000,
        }).asPromise();
        await conn.close();
        console.log(`[AutoBackup] ✓ Backup MongoDB daemon is online on port ${BACKUP_MONGO_PORT}.`);
        return true;
      } catch {
        // Continue waiting
      }
    }
    console.warn(`[AutoBackup] ⚠️ Backup MongoDB could not be reached on port ${BACKUP_MONGO_PORT}.`);
    return false;
  } catch (spawnErr) {
    console.error(`[AutoBackup] Error launching mongod for port ${BACKUP_MONGO_PORT}:`, spawnErr.message);
    return false;
  }
}

/**
 * Sync storage files incrementally (only copies new or changed files)
 */
export function syncStorageFiles() {
  if (!fs.existsSync(SOURCE_STORAGE_PATH)) {
    console.warn(`[AutoBackup] Source storage not found: ${SOURCE_STORAGE_PATH}`);
    return { copiedCount: 0, totalFiles: 0 };
  }

  ensureBackupDirectories();

  let copiedCount = 0;
  let totalFiles = 0;

  function syncDir(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      // Don't recursively copy backup directory if it's placed inside source
      if (entry.name === "mongodb_data" || entry.name === "db_backup") {
        continue;
      }

      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        syncDir(srcPath, destPath);
      } else if (entry.isFile()) {
        totalFiles++;
        let needsCopy = false;

        if (!fs.existsSync(destPath)) {
          needsCopy = true;
        } else {
          try {
            const srcStat = fs.statSync(srcPath);
            const destStat = fs.statSync(destPath);
            if (srcStat.mtimeMs > destStat.mtimeMs || srcStat.size !== destStat.size) {
              needsCopy = true;
            }
          } catch {
            needsCopy = true;
          }
        }

        if (needsCopy) {
          try {
            fs.copyFileSync(srcPath, destPath);
            copiedCount++;
          } catch (copyErr) {
            console.error(`[AutoBackup] Failed to copy file ${srcPath}:`, copyErr.message);
          }
        }
      }
    }
  }

  syncDir(SOURCE_STORAGE_PATH, BACKUP_STORAGE_PATH);

  if (copiedCount > 0) {
    console.log(`[AutoBackup] Storage synchronized: ${copiedCount} files updated (Total: ${totalFiles} files).`);
  }

  return { copiedCount, totalFiles };
}

/**
 * Synchronize MongoDB Database from Primary (27017) to Backup (27018) + JSON dump
 */
export async function syncDatabase() {
  ensureBackupDirectories();

  // 1. Connect to Primary DB
  const primaryConn = await mongoose.createConnection(PRIMARY_MONGO_URI).asPromise();
  const collections = await primaryConn.db.listCollections().toArray();
  const summary = {};

  // 2. Export each collection to JSON dump
  for (const col of collections) {
    const colName = col.name;
    // Skip internal system collections
    if (colName.startsWith("system.")) continue;

    const docs = await primaryConn.db.collection(colName).find({}).toArray();
    const filePath = path.join(BACKUP_DB_DUMP_PATH, `${colName}.json`);

    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), "utf-8");
    summary[colName] = docs.length;
  }
  await primaryConn.close();

  // 3. Connect to Backup DB on Port 27018
  const isBackupRunning = await ensureBackupMongoDaemon();
  if (isBackupRunning) {
    let backupConn = null;
    try {
      backupConn = await mongoose.createConnection(BACKUP_MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      }).asPromise();

      for (const colName of Object.keys(summary)) {
        const filePath = path.join(BACKUP_DB_DUMP_PATH, `${colName}.json`);
        if (!fs.existsSync(filePath)) continue;

        const docs = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const collection = backupConn.db.collection(colName);

        try {
          await collection.drop();
        } catch {
          // Ignore if collection did not exist
        }

        if (docs.length > 0) {
          await collection.insertMany(docs, { ordered: false });
        }
      }
      console.log(`[AutoBackup] ✓ Synchronized ${Object.keys(summary).length} collections to MongoDB port ${BACKUP_MONGO_PORT}.`);
    } catch (err) {
      console.warn(`[AutoBackup] ⚠️ Error replicating to MongoDB port ${BACKUP_MONGO_PORT}:`, err.message);
    } finally {
      if (backupConn) {
        await backupConn.close().catch(() => {});
      }
    }
  }

  return summary;
}

/**
 * Writes BACKUP_INFO.json manifest
 */
function updateBackupManifest(totalFiles, dbSummary, durationMs) {
  const manifest = {
    backupDate: new Date().toISOString(),
    syncMode: "AUTOMATIC_BACKGROUND_SYNC",
    primaryMongoPort: 27017,
    backupMongoPort: BACKUP_MONGO_PORT,
    primaryStoragePath: SOURCE_STORAGE_PATH,
    backupStoragePath: BACKUP_STORAGE_PATH,
    backupMongoDataPath: BACKUP_MONGO_DATA_PATH,
    backupDbDumpPath: BACKUP_DB_DUMP_PATH,
    totalStorageFilesBackedUp: totalFiles,
    collectionsBackedUp: dbSummary,
    lastDurationMs: durationMs,
    status: "HEALTHY_AND_UP_TO_DATE",
  };

  const manifestPath = path.join(BACKUP_STORAGE_PATH, "BACKUP_INFO.json");
  try {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  } catch (err) {
    console.error(`[AutoBackup] Failed writing BACKUP_INFO.json:`, err.message);
  }
}

/**
 * Execute a complete sync cycle (Files + Database)
 */
export async function runFullSync() {
  if (isSyncInProgress) {
    console.log("[AutoBackup] Sync already in progress, skipping duplicate cycle.");
    return backupStatus;
  }

  isSyncInProgress = true;
  backupStatus.isSyncing = true;
  const startTime = Date.now();

  try {
    console.log(`[AutoBackup] 🔄 Running automated backup update (${new Date().toLocaleTimeString()})...`);
    
    // 1. Sync Storage files
    const { totalFiles } = syncStorageFiles();

    // 2. Sync MongoDB Collections
    const dbSummary = await syncDatabase();

    const durationMs = Date.now() - startTime;
    updateBackupManifest(totalFiles, dbSummary, durationMs);

    backupStatus.lastSyncTime = new Date().toISOString();
    backupStatus.lastSyncStatus = "SUCCESS";
    backupStatus.lastDurationMs = durationMs;
    backupStatus.totalFilesBackedUp = totalFiles;
    backupStatus.collectionsCount = Object.keys(dbSummary).length;
    backupStatus.lastError = null;

    console.log(`[AutoBackup] ✅ Automated backup update complete in ${durationMs}ms. Status: HEALTHY.`);
  } catch (err) {
    backupStatus.lastSyncStatus = "ERROR";
    backupStatus.lastError = err.message;
    console.error("[AutoBackup] ❌ Automated backup update encountered an error:", err);
  } finally {
    isSyncInProgress = false;
    backupStatus.isSyncing = false;
  }

  return backupStatus;
}

/**
 * Real-time Storage File Watcher
 * Watches source storage folder for added/modified files and triggers debounced sync
 */
function startStorageWatcher() {
  if (!fs.existsSync(SOURCE_STORAGE_PATH)) {
    return;
  }

  try {
    storageWatcher = fs.watch(
      SOURCE_STORAGE_PATH,
      { recursive: true },
      (eventType, filename) => {
        if (!filename) return;
        // Debounce storage sync
        clearTimeout(watcherDebounceTimer);
        watcherDebounceTimer = setTimeout(() => {
          console.log(`[AutoBackup Watcher] Storage change detected (${filename}), updating backup...`);
          syncStorageFiles();
        }, 3000);
      }
    );

    console.log(`[AutoBackup] 👁️ Real-time storage file watcher active on ${SOURCE_STORAGE_PATH}`);
  } catch (err) {
    console.warn(`[AutoBackup] Could not initialize real-time fs.watch:`, err.message);
  }
}

/**
 * Start the Auto Backup Service
 */
export function startAutoBackupService() {
  if (syncIntervalTimer) {
    console.log("[AutoBackup] Service is already running.");
    return;
  }

  const intervalMinutes = ENV.AUTO_BACKUP_INTERVAL_MINUTES || 15;
  backupStatus.enabled = true;

  console.log("====================================================");
  console.log(`🔄 TechVerse Auto-Backup Service Started`);
  console.log(`📂 Source Storage: ${SOURCE_STORAGE_PATH}`);
  console.log(`💾 Backup Storage: ${BACKUP_STORAGE_PATH}`);
  console.log(`🗄️ Backup MongoDB: Port ${BACKUP_MONGO_PORT}`);
  console.log(`⏱️ Auto-Sync Interval: Every ${intervalMinutes} minutes`);
  console.log("====================================================");

  // Initialize directories
  ensureBackupDirectories();

  // Start real-time storage watcher
  startStorageWatcher();

  // Run initial sync asynchronously
  setTimeout(() => {
    runFullSync().catch((e) => console.error("[AutoBackup Initial Sync Error]:", e));
  }, 3000);

  // Periodic timer
  const intervalMs = intervalMinutes * 60 * 1000;
  syncIntervalTimer = setInterval(() => {
    runFullSync().catch((e) => console.error("[AutoBackup Periodic Sync Error]:", e));
  }, intervalMs);
}

/**
 * Stop the Auto Backup Service
 */
export function stopAutoBackupService() {
  if (syncIntervalTimer) {
    clearInterval(syncIntervalTimer);
    syncIntervalTimer = null;
  }
  if (storageWatcher) {
    storageWatcher.close();
    storageWatcher = null;
  }
  backupStatus.enabled = false;
  console.log("[AutoBackup] Service stopped.");
}

/**
 * Get current backup status
 */
export function getAutoBackupStatus() {
  return {
    ...backupStatus,
    timestamp: new Date().toISOString(),
  };
}

export default {
  startAutoBackupService,
  stopAutoBackupService,
  runFullSync,
  syncStorageFiles,
  syncDatabase,
  ensureBackupMongoDaemon,
  getAutoBackupStatus,
};
