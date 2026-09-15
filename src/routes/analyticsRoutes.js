import express from "express";
import {
  getOverview,
  getStudentAnalytics,
  getDepartmentDetails,
  getViolationsAnalytics,
  recordVisitor,
  getVisitorCount,
} from "../controllers/analyticsController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/overview", getOverview);
router.post("/visitors/record", recordVisitor);
router.get("/visitors/count", getVisitorCount);
router.get("/student", authenticate, authorize("student"), getStudentAnalytics);
router.get("/violations", authenticate, authorize("teacher", "admin"), getViolationsAnalytics);
router.get("/department/:id?", authenticate, authorize("teacher", "admin"), getDepartmentDetails);

export default router;
