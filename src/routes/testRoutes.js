import express from "express";
import {
  getTodayTest,
  getDailyTests,
  getTestById,
  submitTest,
  recordTestViolation,
  getMyAttempts,
  createTest,
  updateTest,
  deleteTest,
} from "../controllers/testController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    authenticate(req, res, () => next());
  } else {
    next();
  }
};

router.get("/today", optionalAuth, getTodayTest);
router.get("/my/attempts", authenticate, authorize("student"), getMyAttempts);
router.get("/", optionalAuth, getDailyTests);
router.get("/:id", optionalAuth, getTestById);
router.post("/:id/submit", optionalAuth, submitTest);
router.post("/:id/violation", optionalAuth, recordTestViolation);
router.post("/", authenticate, authorize("teacher", "admin"), createTest);
router.put("/:id", authenticate, authorize("teacher", "admin"), updateTest);
router.delete("/:id", authenticate, authorize("teacher", "admin"), deleteTest);

export default router;
