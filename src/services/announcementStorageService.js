import http from "http";
import path from "path";
import { ENV } from "../config/env.js";
import { deleteUploadedFile } from "../utils/fileUpload.js";

/**
 * Gets base URL of the Announcement Storage Server.
 * Supports dynamic hostname from client request (e.g. LAN IP / custom domain)
 * or fallback to configured STORAGE_SERVER_URL.
 */
export function getAnnouncementStorageBaseUrl(req) {
  const configured = ENV.STORAGE_SERVER_URL || `http://localhost:${ENV.STORAGE_PORT || 5001}`;

  if (!req) return configured;

  try {
    const hostHeader = req.get("host") || "";
    if (hostHeader) {
      const hostname = hostHeader.split(":")[0];
      const protocol = req.protocol || "http";
      const storagePort = ENV.STORAGE_PORT || 5001;
      return `${protocol}://${hostname}:${storagePort}`;
    }
  } catch {
    // fallback to configured
  }

  return configured;
}

/**
 * Builds public URL for an announcement file on the dedicated storage server.
 * E.g., http://localhost:5001/files/banner-123456.jpg
 */
export function buildAnnouncementFileUrl(filenameOrPath, req) {
  if (!filenameOrPath || typeof filenameOrPath !== "string") return "";

  // Already a full external URL or data URI
  if (
    filenameOrPath.startsWith("http://") ||
    filenameOrPath.startsWith("https://") ||
    filenameOrPath.startsWith("data:")
  ) {
    return filenameOrPath;
  }

  const filename = path.basename(filenameOrPath);
  const baseUrl = getAnnouncementStorageBaseUrl(req);
  return `${baseUrl}/files/${filename}`;
}

/**
 * Cleanly deletes an announcement file from disk / storage server.
 */
export function deleteAnnouncementFromStorage(filePathOrUrl) {
  if (!filePathOrUrl) return;
  deleteUploadedFile(filePathOrUrl, "announcements");
}

/**
 * Checks if the separate Announcement Storage Server is alive and responsive.
 */
export function checkAnnouncementStorageHealth() {
  return new Promise((resolve) => {
    const port = ENV.STORAGE_PORT || 5001;
    const req = http.get(
      {
        host: "127.0.0.1",
        port,
        path: "/health",
        timeout: 2000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ ok: res.statusCode === 200, data: JSON.parse(data) });
          } catch {
            resolve({ ok: res.statusCode === 200 });
          }
        });
      }
    );

    req.on("error", () => {
      resolve({ ok: false, error: "Announcement Storage Server not reachable on port " + port });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, error: "Health check timed out" });
    });
  });
}

export default {
  getAnnouncementStorageBaseUrl,
  buildAnnouncementFileUrl,
  deleteAnnouncementFromStorage,
  checkAnnouncementStorageHealth,
};
