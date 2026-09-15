import express from "express";
import {
  getUsers,
  getLeaderboard,
  getPointsHistory,
  getStreakInfo,
} from "../controllers/userController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getUsers);
router.get("/leaderboard", getLeaderboard);
router.get("/points-history", authenticate, getPointsHistory);
router.get("/streak", authenticate, getStreakInfo);

export default router;
