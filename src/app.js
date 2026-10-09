import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import compression from "compression";

// Ensure User model is registered before any route handlers execute
import "./models/User.js";

// Middlewares
import { notFoundHandler } from "./middleware/notFoundMiddleware.js";
import { errorHandler } from "./middleware/errorMiddleware.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import classRoutes from "./routes/classRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import resourceRoutes from "./routes/resourceRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import techPulseRoutes from "./routes/techPulseRoutes.js";
import placementEventRoutes from "./routes/placementEventRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import moduleRoutes from "./routes/moduleRoutes.js";
import courseAssessmentRoutes from "./routes/courseAssessmentRoutes.js";
import codingRoutes from "./routes/codingRoutes.js";
import certificateRoutes from "./routes/certificateRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import visitorRoutes from "./routes/visitorRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import trainingRoutes from "./routes/trainingRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// High performance response compression (gzip/deflate/brotli)
app.use(compression());

// Enable Cross-Origin Resource Sharing
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Body Parsers
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// HTTP Request Logger Middleware
const logFilePath = path.join(process.cwd(), "app.log");

app.use((req, res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;
  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const timestamp = new Date().toISOString();
    const color =
      status >= 500
        ? "\x1b[31m"
        : status >= 400
        ? "\x1b[33m"
        : status >= 300
        ? "\x1b[36m"
        : "\x1b[32m";
    console.log(
      `[${new Date().toLocaleTimeString()}] ${color}${method}\x1b[0m ${originalUrl} -> ${color}${status}\x1b[0m (${duration}ms)`
    );

    // Append to app.log
    const logLine = `[${timestamp}] ${method} ${originalUrl} -> ${status} (${duration}ms)\n`;
    fs.appendFile(logFilePath, logLine, (err) => {
      if (err) {
        // Silently ignore or fallback
      }
    });
  });
  next();
});

// Static uploads serving
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// System Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "TechVerse Institutional Backend API",
    institution: "Velalar College of Engineering and Technology (Autonomous), Erode",
    tagline: "Explore • Learn • Build",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/tech-pulse", techPulseRoutes);
app.use("/api/placement-events", placementEventRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/course-assessments", courseAssessmentRoutes);
app.use("/api/coding", codingRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/visitors", visitorRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/training", trainingRoutes);

// Serve Frontend Static Bundle for Combined Single Link Access
const frontendDistPaths = [
  path.resolve(__dirname, "../../frontend/dist"),
  path.resolve(process.cwd(), "frontend/dist"),
  path.resolve(process.cwd(), "../frontend/dist"),
];
const distPath = frontendDistPaths.find((p) => fs.existsSync(p));

if (distPath) {
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// 404 & Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

