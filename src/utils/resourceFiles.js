import fs from "fs";
import path from "path";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads", "resources");

/**
 * Best-effort removal of stored resource files from disk.
 * Accepts a single resource document or an array. Missing files are ignored.
 */
export function removeResourceFiles(resources) {
  if (!resources) return;
  const items = Array.isArray(resources) ? resources : [resources];

  for (const resource of items) {
    if (!resource || !resource.fileUrl || !resource.fileUrl.startsWith("/uploads/resources/")) {
      continue;
    }

    const filePath = path.join(UPLOADS_ROOT, path.basename(resource.fileUrl));
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      // Ignore unlinkable or concurrently-removed files.
    }
  }
}