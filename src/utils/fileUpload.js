import multer from "multer";
import path from "path";
import fs from "fs";

// Base upload directory
const baseUploadDir = path.join(process.cwd(), "uploads");

// Ensure subdirectories exist
const subDirs = ["announcements", "courses", "resources"];
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
