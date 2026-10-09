import express from "express";
import rateLimit from "express-rate-limit";
import {
  getCodingTests,
  getCodingTestById,
  getCodingProgress,
  getAllCodingTestsAdmin,
  createCodingTest,
  updateCodingTest,
  deleteCodingTest,
  addProblemToTest,
  updateProblemInTest,
  deleteProblemFromTest,
  runCode,
  submitCode,
  recordCodingViolation,
} from "../controllers/codingController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

const codingRateLimit = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { keyGeneratorIpFallback: false },
    keyGenerator: (req) => (req.user?._id ? String(req.user._id) : req.ip),
    handler: (req, res) => {
      const resetAt = req.rateLimit?.resetTime;
      const retryAfter = resetAt ? Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)) : Math.ceil(windowMs / 1000);
      return res.status(429).json({
        success: false,
        message,
        code: "TOO_MANY_RUNS",
        retryAfter,
      });
    },
  });

const runLimiter = codingRateLimit(
  60 * 1000,
  30,
  "You're running code too quickly. Please wait a moment and try again."
);
const submitLimiter = codingRateLimit(
  60 * 1000,
  10,
  "Too many submissions. Please wait a moment and try again."
);

// Public / Student Read
router.get("/", getCodingTests);
router.get("/:id", getCodingTestById);
router.get("/:id/progress", protect, getCodingProgress);

// Teacher / Faculty / HOD / Admin Management Endpoints
router.get("/admin/all", protect, authorize("admin", "teacher", "faculty", "hod"), getAllCodingTestsAdmin);
router.post("/", protect, authorize("admin", "teacher", "faculty", "hod"), createCodingTest);
router.put("/:id", protect, authorize("admin", "teacher", "faculty", "hod"), updateCodingTest);
router.delete("/:id", protect, authorize("admin", "teacher", "faculty", "hod"), deleteCodingTest);

// Problem-level CRUD for Teachers / HOD
router.post("/:id/problems", protect, authorize("admin", "teacher", "faculty", "hod"), addProblemToTest);
router.put("/:id/problems/:problemId", protect, authorize("admin", "teacher", "faculty", "hod"), updateProblemInTest);
router.delete("/:id/problems/:problemId", protect, authorize("admin", "teacher", "faculty", "hod"), deleteProblemFromTest);

// Student Code Execution & Proctoring
router.post("/:id/run", protect, runLimiter, runCode);
router.post("/:id/submit", protect, submitLimiter, submitCode);
router.post("/:id/violation", protect, recordCodingViolation);

export default router;

