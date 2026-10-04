import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base upload directory - always resolves accurately to the project's uploads folder
const baseUploadDir = path.resolve(__dirname, "../../uploads");

// Ensure subdirectories exist
const subDirs = ["announcements", "courses", "resources", "placement-events"];
subDirs.forEach((sub) => {
  const dir = path.join(baseUploadDir, sub);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
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

  uploadHandler(req, res, (err) => {
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
    }
    next();
  });
};

export const uploadPlacementPoster = multer({
  storage: createDynamicStorage("placement-events"),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPG, PNG, WebP) are allowed for placement event posters!"), false);
    }
  },
});

export const uploadCourseThumbnail = multer({
  storage: createDynamicStorage("courses"),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPG, PNG, WebP) are allowed for course cover thumbnails!"), false);
    }
  },
});

export const upload = multer({
  storage: createDynamicStorage("resources"),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const ALLOWED_RESOURCE_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
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

export const uploadResourceFile = multer({
  storage: createDynamicStorage("resources"),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_RESOURCE_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Unsupported file type. Allowed: PDF, Word, PowerPoint, Excel, images, text, and zip archives."
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

    // If it's a data URI or an external web URL that doesn't contain /uploads/, skip
    if (clean.startsWith("data:")) return;
    if ((clean.startsWith("http://") || clean.startsWith("https://")) && !clean.includes("/uploads/")) {
      return;
    }

    let absoluteTarget = null;
    if (clean.includes("/uploads/")) {
      const rel = clean.split("/uploads/")[1].replace(/\\/g, "/");
      absoluteTarget = path.resolve(baseUploadDir, rel);
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
