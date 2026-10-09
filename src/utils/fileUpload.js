import fs from "fs";
import path from "path";
import multer from "multer";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base upload directory - always resolves accurately to the project's uploads folder
const baseUploadDir = path.resolve(__dirname, "../../uploads");

// Ensure subdirectories exist
const subDirs = ["announcements", "courses", "resources", "placement-events", "tech-pulse"];
subDirs.forEach((sub) => {
  const dir = path.join(baseUploadDir, sub);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * High-performance image compression using sharp.
 * Automatically resizes giant phone camera pictures (e.g., 5-10MB)
 * down to ~100-250KB WebP/JPEG with superior quality.
 */
export async function compressImageFile(filePath, { maxWidth = 1600, quality = 80 } = {}) {
  if (!filePath || typeof filePath !== "string" || !fs.existsSync(filePath)) return null;
  const ext = path.extname(filePath).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) return filePath;

  try {
    const tmpPath = filePath + ".opt.tmp";
    const image = sharp(filePath);
    const metadata = await image.metadata();

    let transform = image.rotate(); // auto-rotate based on EXIF orientation
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
        console.log(`[Sharp Compression]: Compressed ${path.basename(filePath)} from ${(origSize / 1024).toFixed(1)}KB -> ${(compSize / 1024).toFixed(1)}KB`);
      } else {
        fs.unlinkSync(tmpPath);
      }
    }
    return filePath;
  } catch (err) {
    console.error("[Sharp Compression Error]:", err.message);
    return filePath;
  }
}

/**
 * Middleware to compress uploaded files after multer executes
 */
export const compressUploadedImages = async (req, res, next) => {
  try {
    const files = [];
    if (req.file) files.push(req.file);
    if (req.files) {
      if (Array.isArray(req.files)) {
        files.push(...req.files);
      } else {
        Object.values(req.files).forEach((arr) => {
          if (Array.isArray(arr)) files.push(...arr);
        });
      }
    }
    for (const f of files) {
      if (f?.path && (f.mimetype?.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(f.originalname))) {
        await compressImageFile(f.path);
        if (fs.existsSync(f.path)) {
          f.size = fs.statSync(f.path).size;
        }
      }
    }
  } catch (err) {
    console.warn("[compressUploadedImages Warning]:", err.message);
  }
  next();
};

function createDynamicStorage(subFolder) {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      const folder = path.join(baseUploadDir, subFolder || "resources");
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
      cb(null, folder);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
      cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
    },
  });
}

// Dedicated upload middlewares
export const uploadAnnouncementImage = multer({
  storage: createDynamicStorage("announcements"),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max input, compressed down on save
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || /\.(jpe?g|png|webp|gif|svg)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPG, PNG, WebP) are allowed for announcement banners!"), false);
    }
  },
});

export const handleAnnouncementUpload = (req, res, next) => {
  const uploadHandler = uploadAnnouncementImage.fields([
    { name: "image", maxCount: 1 },
    { name: "file", maxCount: 1 },
    { name: "banner", maxCount: 1 },
    { name: "poster", maxCount: 1 },
  ]);

  uploadHandler(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "Announcement image upload failed.",
      });
    }
    if (req.files) {
      const chosen =
        req.files.image?.[0] ||
        req.files.file?.[0] ||
        req.files.banner?.[0] ||
        req.files.poster?.[0];
      req.file = chosen;

      // Unlink any duplicate files sent in the same request
      Object.keys(req.files).forEach((key) => {
        req.files[key]?.forEach((f) => {
          if (chosen && f.path !== chosen.path && fs.existsSync(f.path)) {
            try {
              fs.unlinkSync(f.path);
            } catch {}
          }
        });
      });

      if (chosen && chosen.path) {
        await compressImageFile(chosen.path);
        if (fs.existsSync(chosen.path)) {
          chosen.size = fs.statSync(chosen.path).size;
        }
      }
    }
    next();
  });
};

export const uploadTechPulseLogo = multer({
  storage: createDynamicStorage("tech-pulse"),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max for a feed logo
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || /\.(jpe?g|png|webp|gif|svg)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPG, PNG, WebP) are allowed for Tech Pulse logos!"), false);
    }
  },
});

export const handleTechPulseUpload = (req, res, next) => {
  uploadTechPulseLogo.single("logo")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "Tech Pulse logo upload failed.",
      });
    }
    if (req.file?.path) {
      await compressImageFile(req.file.path, { maxWidth: 512, quality: 85 });
      if (fs.existsSync(req.file.path)) {
        req.file.size = fs.statSync(req.file.path).size;
      }
    }
    next();
  });
};

export const uploadPlacementPoster = multer({
  storage: createDynamicStorage("placement-events"),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || /\.(jpe?g|png|webp|gif|svg)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPG, PNG, WebP) are allowed for placement event posters!"), false);
    }
  },
});

export const uploadCourseThumbnail = multer({
  storage: createDynamicStorage("courses"),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || /\.(jpe?g|png|webp|gif|svg)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPG, PNG, WebP) are allowed for course cover thumbnails!"), false);
    }
  },
});

export const upload = multer({
  storage: createDynamicStorage("resources"),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for PPT, PDF, resources
});

// Comprehensive MIME list for all presentation, document, code, and archive files
const ALLOWED_RESOURCE_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
  "application/vnd.openxmlformats-officedocument.presentationml.template",
  "application/x-mspowerpoint",
  "application/powerpoint",
  "application/mspowerpoint",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/octet-stream",
]);

const ALLOWED_RESOURCE_EXTENSIONS = new Set([
  ".ppt",
  ".pptx",
  ".pps",
  ".ppsx",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".zip",
  ".rar",
  ".7z",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
]);

export const uploadResourceFile = multer({
  storage: createDynamicStorage("resources"),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_RESOURCE_MIME.has(file.mimetype) || ALLOWED_RESOURCE_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Unsupported file type. Allowed: PowerPoint (PPT, PPTX), PDF, Word, Excel, images, text, and zip archives."
        ),
        false
      );
    }
  },
});

/**
 * Utility to safely delete an uploaded file from disk.
 * Supports full /uploads/... paths, relative paths, or raw filenames.
 */
export const deleteUploadedFile = (filePathOrName, subFolder = "announcements") => {
  if (!filePathOrName || typeof filePathOrName !== "string") return;
  try {
    let clean = filePathOrName.trim();
    if (!clean) return;

    // If it's a data URI or an external web URL that doesn't contain /uploads/ or /files/, skip
    if (clean.startsWith("data:")) return;
    if (
      (clean.startsWith("http://") || clean.startsWith("https://")) &&
      !clean.includes("/uploads/") &&
      !clean.includes("/files/")
    ) {
      return;
    }

    let absoluteTarget = null;
    if (clean.includes("/uploads/")) {
      const rel = clean.split("/uploads/")[1].replace(/\\/g, "/");
      absoluteTarget = path.resolve(baseUploadDir, rel);
    } else if (clean.includes("/files/")) {
      const filename = path.basename(clean.split("?")[0]);
      absoluteTarget = path.resolve(baseUploadDir, subFolder, filename);
    } else if (clean.startsWith("uploads/")) {
      const rel = clean.replace(/^uploads\//, "").replace(/\\/g, "/");
      absoluteTarget = path.resolve(baseUploadDir, rel);
    } else {
      const basename = path.basename(clean);
      absoluteTarget = path.resolve(baseUploadDir, subFolder, basename);
    }

    if (absoluteTarget && fs.existsSync(absoluteTarget)) {
      fs.unlinkSync(absoluteTarget);
      console.log(`[FileUpload Cleanup]: Successfully deleted file -> ${absoluteTarget}`);
    }
  } catch (err) {
    console.error(`[FileUpload Cleanup Error]: ${err.message}`);
  }
};
