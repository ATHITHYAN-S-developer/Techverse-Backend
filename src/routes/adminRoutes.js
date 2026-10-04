import express from "express";
import {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  resetPassword,
  deleteUser,
} from "../controllers/adminController.js";
import {
  getDashboard,
  getNotifications,
  searchDashboard,
  getViolationSummary,
} from "../controllers/adminDashboardController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/users", authenticate, authorize("admin", "hod"), getUsers);

router.use(authenticate, authorize("admin"));

router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.put("/users/:id/status", toggleUserStatus);
router.put("/users/:id/reset-password", resetPassword);
router.delete("/users/:id", deleteUser);

// Executive control center
router.get("/dashboard", getDashboard);
router.get("/dashboard/notifications", getNotifications);
router.get("/dashboard/search", searchDashboard);
router.get("/dashboard/violations-summary", getViolationSummary);

export default router;
