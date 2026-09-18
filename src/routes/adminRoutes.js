import express from "express";
import {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  resetPassword,
  deleteUser,
} from "../controllers/adminController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(authenticate, authorize("admin"));

router.get("/users", getUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.put("/users/:id/status", toggleUserStatus);
router.put("/users/:id/reset-password", resetPassword);
router.delete("/users/:id", deleteUser);

export default router;
