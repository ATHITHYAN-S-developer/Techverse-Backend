import express from "express";
import {
  getUsers,
  getLeaderboard,
  getStreakInfo,
  getDepartmentStats,
  getFacultyStats,
} from "../controllers/userController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getUsers);
router.get("/leaderboard", getLeaderboard);
router.get("/streak", authenticate, getStreakInfo);

// Department-level stats (students, faculty, resources, courses) for HOD/Faculty portals
router.get("/department-stats", authenticate, getDepartmentStats);

// Personal faculty stats (my resources, my courses, dept students)
router.get("/faculty-stats", authenticate, getFacultyStats);

export default router;
