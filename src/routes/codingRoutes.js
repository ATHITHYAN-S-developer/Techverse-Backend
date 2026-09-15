import express from "express";
import {
  getCodingTests,
  getCodingTestById,
  runCode,
  submitCode,
  recordCodingViolation,
} from "../controllers/codingController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public / Read
router.get("/", getCodingTests);
router.get("/:id", getCodingTestById);

// Protected (Student execution)
router.post("/:id/run", protect, runCode);
router.post("/:id/submit", protect, submitCode);
router.post("/:id/violation", protect, recordCodingViolation);

export default router;
