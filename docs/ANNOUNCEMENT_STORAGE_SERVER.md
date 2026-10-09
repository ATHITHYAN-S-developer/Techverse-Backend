# Dedicated Announcement Storage Server

## Overview
A dedicated microservice within `Techverse-Backend` responsible for uploading, compressing, serving, and managing announcement media (banners, posters, and attachments) stored in:
```
Techverse-Backend/uploads/announcements
```

## Features
- **Independent Microservice Architecture**: Can run as an independent server (`port 5001` by default) or auto-start alongside the main backend server (`port 5000`).
- **High Performance Image Optimization**: Automatically optimizes incoming images using `sharp` (auto-orientation, max width resizing, compression to lightweight WebP/JPEG) for faster page loads.
- **Aggressive Caching**: High-efficiency static file delivery with HTTP `Cache-Control` (`public, max-age=86400, stale-while-revalidate=604800`) and CORS headers.
- **Security**: Strict path-traversal prevention (preventing `../` attacks) and MIME-type verification.
- **Zero Breaking Changes**: Fully backwards compatible with existing `/uploads/announcements/...` file paths and database records.

---

## Configuration (`.env`)
| Variable | Default | Description |
|---|---|---|
| `STORAGE_PORT` | `5001` | Dedicated port for announcement storage service |
| `STORAGE_SERVER_URL` | `http://localhost:5001` | Public base URL used for resolving announcement image links |
| `AUTO_START_STORAGE_SERVER` | `true` | Automatically run storage server when launching main backend (`npm run dev` or `npm start`) |
| `STORAGE_MAX_FILE_SIZE` | `26214400` (25MB) | Max upload size in bytes |

---

## How to Run

### 1. Alongside Main Backend (Default)
When you run the main backend, the Announcement Storage Server will start automatically on port 5001:
```bash
npm run dev
# or
npm start
```

### 2. Standalone Mode (Dedicated Terminal or Container)
To run only the Announcement Storage Server:
```bash
# Production mode
npm run storage

# Development with nodemon auto-reload
npm run storage:dev
```

---

## API Endpoints

### 1. Health & Diagnostics
- **`GET /health`** or **`GET /storage/health`**
  - Returns storage status, file count, disk usage, and server uptime.
- **`GET /stats`**
  - Returns file count, total size in MB/KB, and file extension breakdown.

### 2. Uploads
- **`POST /upload`**
  - Upload a single announcement poster/image.
  - Accepts `multipart/form-data` with field name `image`, `file`, `banner`, or `poster`.
  - Response:
    ```json
    {
      "success": true,
      "message": "Announcement media successfully stored",
      "file": {
        "filename": "annual-day-1791555700-12345.jpeg",
        "originalName": "annual-day.jpg",
        "mimetype": "image/jpeg",
        "size": 184520,
        "sizeKB": "180.2",
        "url": "http://localhost:5001/files/annual-day-1791555700-12345.jpeg",
        "path": "/uploads/announcements/annual-day-1791555700-12345.jpeg"
      }
    }
    ```
- **`POST /upload/multiple`**
  - Upload multiple files in field `files`.

### 3. Media Serving & Download
- **`GET /files/:filename`**
  - Serves announcement media file with aggressive caching headers and CORS.
- **`GET /uploads/announcements/:filename`**
  - Direct compatibility alias for `/files/:filename`.
- **`GET /download/:filename`**
  - Forces browser file download (`Content-Disposition: attachment`).
- **`GET /files`**
  - Lists all announcement files with metadata. Supports `?search=keyword&limit=50`.

### 4. File Removal
- **`DELETE /files/:filename`**
  - Securely deletes the file from disk storage.
