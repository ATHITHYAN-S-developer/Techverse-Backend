import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

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
import courseRoutes from "./routes/courseRoutes.js";
import moduleRoutes from "./routes/moduleRoutes.js";
import testRoutes from "./routes/testRoutes.js";
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
app.use("/api/courses", courseRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/tests", testRoutes);
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

