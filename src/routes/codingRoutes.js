import express from "express";
import {
  getCodingTests,
  getCodingTestById,
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

// Public / Student Read
router.get("/", getCodingTests);
router.get("/:id", getCodingTestById);

// Teacher / Faculty / Admin Management Endpoints
router.get("/admin/all", protect, authorize("admin", "teacher", "faculty"), getAllCodingTestsAdmin);
router.post("/", protect, authorize("admin", "teacher", "faculty"), createCodingTest);
router.put("/:id", protect, authorize("admin", "teacher", "faculty"), updateCodingTest);
router.delete("/:id", protect, authorize("admin", "teacher", "faculty"), deleteCodingTest);

// Problem-level CRUD for Teachers
router.post("/:id/problems", protect, authorize("admin", "teacher", "faculty"), addProblemToTest);
router.put("/:id/problems/:problemId", protect, authorize("admin", "teacher", "faculty"), updateProblemInTest);
router.delete("/:id/problems/:problemId", protect, authorize("admin", "teacher", "faculty"), deleteProblemFromTest);

// Student Code Execution & Proctoring
router.post("/:id/run", protect, runCode);
router.post("/:id/submit", protect, submitCode);
router.post("/:id/violation", protect, recordCodingViolation);

export default router;

