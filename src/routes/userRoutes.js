import express from "express";
import {
  getUsers,
  getLeaderboard,
  getStreakInfo,
} from "../controllers/userController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getUsers);
router.get("/leaderboard", getLeaderboard);
router.get("/streak", authenticate, getStreakInfo);

export default router;
