import express from "express";
import fs from "fs";
import path from "path";
import {
  getAutoBackupStatus,
  runFullSync,
  syncStorageFiles,
  syncDatabase,
} from "../services/autoBackupService.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { ENV } from "../config/env.js";

const router = express.Router();

/**
 * GET /api/backup/status
 * Get current auto-backup status and latest manifest
 */
router.get("/status", (req, res) => {
  try {
    const liveStatus = getAutoBackupStatus();
    const manifestPath = path.join(ENV.BACKUP_STORAGE_PATH, "BACKUP_INFO.json");
    let manifest = null;

    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      } catch {}
    }

    res.json({
      success: true,
      liveStatus,
      manifest,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/backup/sync
 * Manually trigger immediate backup sync (HOD or Admin)
 */
router.post("/sync", authenticate, authorize("admin", "hod"), async (req, res) => {
  try {
    const mode = req.query.mode || "all";
    if (mode === "storage") {
      const result = syncStorageFiles();
      return res.json({ success: true, message: "Storage sync complete", result });
    } else if (mode === "db") {
      const result = await syncDatabase();
      return res.json({ success: true, message: "Database sync complete", result });
    }

    // Trigger full sync asynchronously or wait
    runFullSync().catch((e) => console.error("[Manual Backup Error]:", e));

    res.json({
      success: true,
      message: "Automated backup synchronization initiated in background.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
