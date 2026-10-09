import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import http from "http";
import { fileURLToPath } from "url";
import multer from "multer";
import sharp from "sharp";
import compression from "compression";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base upload directory for announcements
const BASE_UPLOADS_DIR = path.resolve(__dirname, "../uploads");
const ANNOUNCEMENTS_DIR = path.join(BASE_UPLOADS_DIR, "announcements");

// Ensure directory exists
if (!fs.existsSync(ANNOUNCEMENTS_DIR)) {
  fs.mkdirSync(ANNOUNCEMENTS_DIR, { recursive: true });
}

const STORAGE_PORT = parseInt(process.env.STORAGE_PORT, 10) || 5001;
const MAX_FILE_SIZE = parseInt(process.env.STORAGE_MAX_FILE_SIZE, 10) || 25 * 1024 * 1024; // 25MB

// Express App Configuration
export const storageApp = express();

storageApp.use(compression());
storageApp.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

storageApp.use(express.json());
storageApp.use(express.urlencoded({ extended: true }));

// Request Logger
storageApp.use((req, res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;
  res.on("finish", () => {
    const duration = Date.now() - start;
    const color = res.statusCode >= 400 ? "\x1b[33m" : "\x1b[32m";
    console.log(
      `[StorageServer] ${color}${method}\x1b[0m ${originalUrl} -> ${color}${res.statusCode}\x1b[0m (${duration}ms)`
    );
  });
  next();
});

// Multer Storage Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(ANNOUNCEMENTS_DIR)) {
      fs.mkdirSync(ANNOUNCEMENTS_DIR, { recursive: true });
    }
    cb(null, ANNOUNCEMENTS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .toLowerCase();
    cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMime = /^image\/(jpeg|png|webp|gif|svg\+xml)$/i;
  const allowedExt = /\.(jpe?g|png|webp|gif|svg)$/i;

  if (allowedMime.test(file.mimetype) || allowedExt.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images (JPG, PNG, WebP, GIF, SVG) are permitted."), false);
  }
};

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

/**
 * Image optimization helper using sharp
 */
async function optimizeImage(filePath, { maxWidth = 1600, quality = 82 } = {}) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const ext = path.extname(filePath).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) return filePath;

  try {
    const tmpPath = filePath + ".opt.tmp";
    const image = sharp(filePath);
    const metadata = await image.metadata();

    let transform = image.rotate(); // preserve orientation
    if (metadata.width && metadata.width > maxWidth) {
      transform = transform.resize({ width: maxWidth, withoutEnlargement: true });
    }

    if (ext === ".png") {
      await transform.png({ quality: Math.min(quality, 85), compressionLevel: 8 }).toFile(tmpPath);
    } else if (ext === ".webp") {
      await transform.webp({ quality }).toFile(tmpPath);
    } else {
      await transform.jpeg({ quality, mozjpeg: true }).toFile(tmpPath);
    }

    if (fs.existsSync(tmpPath)) {
      const origSize = fs.statSync(filePath).size;
      const compSize = fs.statSync(tmpPath).size;
      if (compSize < origSize || compSize < 500 * 1024) {
        fs.unlinkSync(filePath);
        fs.renameSync(tmpPath, filePath);
        console.log(
          `[StorageServer Sharp]: Compressed ${path.basename(filePath)} from ${(origSize / 1024).toFixed(1)}KB -> ${(compSize / 1024).toFixed(1)}KB`
        );
      } else {
        fs.unlinkSync(tmpPath);
      }
    }
    return filePath;
  } catch (err) {
    console.warn(`[StorageServer Sharp Optimization skipped]: ${err.message}`);
    return filePath;
  }
}

/**
 * Helper to build public URL
 */
function buildFileUrl(req, filename) {
  const host = req.get("host") || `localhost:${STORAGE_PORT}`;
  const protocol = req.protocol || "http";
  return `${protocol}://${host}/files/${filename}`;
}

// ----------------------------------------------------
// ROUTES
// ----------------------------------------------------

/**
 * Root Info Endpoint
 */
storageApp.get("/", (req, res) => {
  res.json({
    service: "TechVerse Announcement Storage Server",
    description: "Dedicated microservice for uploading, compressing, serving, and managing announcement media",
    version: "1.0.0",
    storageDirectory: ANNOUNCEMENTS_DIR,
    endpoints: {
      health: "GET /health",
      stats: "GET /stats",
      upload: "POST /upload",
      uploadMultiple: "POST /upload/multiple",
      listFiles: "GET /files",
      serveFile: "GET /files/:filename",
      downloadFile: "GET /download/:filename",
      deleteFile: "DELETE /files/:filename",
    },
  });
});

/**
 * Health Check
 */
storageApp.get(["/health", "/storage/health"], (req, res) => {
  try {
    const files = fs.existsSync(ANNOUNCEMENTS_DIR) ? fs.readdirSync(ANNOUNCEMENTS_DIR) : [];
    let totalSize = 0;
    files.forEach((file) => {
      try {
        const stat = fs.statSync(path.join(ANNOUNCEMENTS_DIR, file));
        if (stat.isFile()) totalSize += stat.size;
      } catch {}
    });

    res.json({
      status: "healthy",
      service: "TechVerse Announcement Dedicated Storage Server",
      port: STORAGE_PORT,
      storagePath: ANNOUNCEMENTS_DIR,
      filesCount: files.length,
      totalSizeBytes: totalSize,
      totalSizeFormatted: `${(totalSize / (1024 * 1024)).toFixed(2)} MB`,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

/**
 * Storage Stats
 */
storageApp.get("/stats", (req, res) => {
  try {
    const files = fs.existsSync(ANNOUNCEMENTS_DIR) ? fs.readdirSync(ANNOUNCEMENTS_DIR) : [];
    let totalBytes = 0;
    const extensionBreakdown = {};

    files.forEach((file) => {
      try {
        const filePath = path.join(ANNOUNCEMENTS_DIR, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          totalBytes += stat.size;
          const ext = path.extname(file).toLowerCase() || "unknown";
          extensionBreakdown[ext] = (extensionBreakdown[ext] || 0) + 1;
        }
      } catch {}
    });

    res.json({
      success: true,
      totalFiles: files.length,
      totalBytes,
      totalKB: (totalBytes / 1024).toFixed(2),
      totalMB: (totalBytes / (1024 * 1024)).toFixed(2),
      extensionBreakdown,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Upload Single Announcement File
 * Supports multipart fields: "image", "file", "banner", "poster"
 */
const singleUploadHandler = uploadMiddleware.fields([
  { name: "image", maxCount: 1 },
  { name: "file", maxCount: 1 },
  { name: "banner", maxCount: 1 },
  { name: "poster", maxCount: 1 },
]);

storageApp.post(["/upload", "/api/storage/upload"], (req, res) => {
  singleUploadHandler(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to process uploaded file.",
      });
    }

    const uploaded =
      req.files?.image?.[0] ||
      req.files?.file?.[0] ||
      req.files?.banner?.[0] ||
      req.files?.poster?.[0];

    if (!uploaded) {
      return res.status(400).json({
        success: false,
        message: "No valid file uploaded. Form field must be one of: 'image', 'file', 'banner', 'poster'",
      });
    }

    // Optimize image
    await optimizeImage(uploaded.path);

    const stat = fs.existsSync(uploaded.path) ? fs.statSync(uploaded.path) : null;
    const actualSize = stat ? stat.size : uploaded.size;
    const fileUrl = buildFileUrl(req, uploaded.filename);

    res.status(201).json({
      success: true,
      message: "Announcement media successfully stored",
      file: {
        filename: uploaded.filename,
        originalName: uploaded.originalname,
        mimetype: uploaded.mimetype,
        size: actualSize,
        sizeKB: (actualSize / 1024).toFixed(1),
        url: fileUrl,
        path: `/uploads/announcements/${uploaded.filename}`,
      },
    });
  });
});

/**
 * Upload Multiple Announcement Files
 */
storageApp.post("/upload/multiple", uploadMiddleware.array("files", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded." });
    }

    const results = [];
    for (const f of req.files) {
      await optimizeImage(f.path);
      const stat = fs.existsSync(f.path) ? fs.statSync(f.path) : null;
      const actualSize = stat ? stat.size : f.size;
      results.push({
        filename: f.filename,
        originalName: f.originalname,
        mimetype: f.mimetype,
        size: actualSize,
        url: buildFileUrl(req, f.filename),
        path: `/uploads/announcements/${f.filename}`,
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully stored ${results.length} files.`,
      files: results,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * List All Announcement Files
 */
storageApp.get("/files", (req, res) => {
  try {
    if (!fs.existsSync(ANNOUNCEMENTS_DIR)) {
      return res.json({ success: true, count: 0, files: [] });
    }

    const { search, limit } = req.query;
    let fileList = fs.readdirSync(ANNOUNCEMENTS_DIR);

    if (search) {
      const q = search.toLowerCase();
      fileList = fileList.filter((f) => f.toLowerCase().includes(q));
    }

    const parsedLimit = parseInt(limit, 10);
    if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
      fileList = fileList.slice(0, parsedLimit);
    }

    const files = fileList.map((filename) => {
      const filePath = path.join(ANNOUNCEMENTS_DIR, filename);
      const stat = fs.statSync(filePath);
      return {
        filename,
        size: stat.size,
        sizeKB: (stat.size / 1024).toFixed(1),
        modifiedAt: stat.mtime,
        url: buildFileUrl(req, filename),
        downloadUrl: `${req.protocol}://${req.get("host")}/download/${filename}`,
      };
    });

    res.json({
      success: true,
      count: files.length,
      files,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Serve Single Announcement File
 * Routes: /files/:filename or /uploads/announcements/:filename
 */
const serveFileHandler = (req, res) => {
  try {
    const rawFilename = req.params.filename;
    if (!rawFilename) {
      return res.status(400).json({ success: false, message: "Filename required." });
    }

    // Guard against path traversal
    const safeFilename = path.basename(rawFilename);
    const resolvedPath = path.resolve(ANNOUNCEMENTS_DIR, safeFilename);

    if (!resolvedPath.startsWith(ANNOUNCEMENTS_DIR)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ success: false, message: "Announcement media file not found." });
    }

    // Set aggressive caching for high performance & fast client display
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.sendFile(resolvedPath);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

storageApp.get("/files/:filename", serveFileHandler);
storageApp.get("/uploads/announcements/:filename", serveFileHandler);

/**
 * Download Announcement File
 */
storageApp.get("/download/:filename", (req, res) => {
  try {
    const safeFilename = path.basename(req.params.filename);
    const resolvedPath = path.resolve(ANNOUNCEMENTS_DIR, safeFilename);

    if (!resolvedPath.startsWith(ANNOUNCEMENTS_DIR) || !fs.existsSync(resolvedPath)) {
      return res.status(404).json({ success: false, message: "File not found." });
    }

    res.download(resolvedPath, safeFilename);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Delete File from Storage
 */
const deleteFileHandler = (req, res) => {
  try {
    const rawFilename = req.params.filename;
    const safeFilename = path.basename(rawFilename);
    const resolvedPath = path.resolve(ANNOUNCEMENTS_DIR, safeFilename);

    if (!resolvedPath.startsWith(ANNOUNCEMENTS_DIR)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ success: false, message: "File not found or already deleted." });
    }

    fs.unlinkSync(resolvedPath);
    console.log(`[StorageServer]: Deleted file -> ${safeFilename}`);

    res.json({
      success: true,
      message: `File '${safeFilename}' successfully deleted from announcement storage.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

storageApp.delete("/files/:filename", deleteFileHandler);
storageApp.delete("/upload/:filename", deleteFileHandler);

// 404 Handler
storageApp.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Storage server route ${req.method} ${req.originalUrl} not found.`,
  });
});

// Error Handler
storageApp.use((err, req, res, next) => {
  console.error("[StorageServer Error]:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Announcement Storage Server Error",
  });
});

/**
 * Function to start server programmatically or standalone
 */
export function startStorageServer(port = STORAGE_PORT) {
  const server = http.createServer(storageApp);

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.warn(`[StorageServer] ⚠️ Storage Port ${port} is currently in use.`);
      console.log(`[StorageServer] Assuming storage server is already active on port ${port}.`);
    } else {
      console.error("[StorageServer] ❌ Server Error:", error);
    }
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`====================================================`);
    console.log(`📦 Announcement Dedicated Storage Server running on port ${port}`);
    console.log(`📂 Storage Path: ${ANNOUNCEMENTS_DIR}`);
    console.log(`📡 Health Check: http://localhost:${port}/health`);
    console.log(`📁 Files Endpoint: http://localhost:${port}/files`);
    console.log(`====================================================`);
  });

  return server;
}

// If executed directly from command line (e.g., `node src/storageServer.js`)
const isDirectlyExecuted =
  process.argv[1] &&
  (path.resolve(process.argv[1]) === path.resolve(__filename) ||
    process.argv[1].endsWith("storageServer.js"));

if (isDirectlyExecuted) {
  startStorageServer(STORAGE_PORT);
}

export default storageApp;
