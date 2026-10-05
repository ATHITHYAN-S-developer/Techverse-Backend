import express from "express";
import {
  login,
  getMe,
  updateProfile,
  changePassword,
  facultyResetPassword,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/faculty-reset-password", facultyResetPassword);
router.get("/me", authenticate, getMe);
router.put("/profile", authenticate, updateProfile);
router.post("/change-password", authenticate, changePassword);

export default router;
