import express from "express";
import {
  getCourseAssessmentForCourse,
  getTestById,
  submitTest,
  recordTestViolation,
} from "../controllers/courseAssessmentController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/course/:courseSlug", getCourseAssessmentForCourse);

router.use(authenticate, authorize("student"));
router.get("/:courseSlug/:assessmentId", getTestById);
router.post("/:courseSlug/:assessmentId/submit", submitTest);
router.post("/:courseSlug/:assessmentId/violation", recordTestViolation);

export default router;
