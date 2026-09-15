import express from "express";
import {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
} from "../controllers/classController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", getClasses);
router.get("/:id", getClassById);
router.post("/", authenticate, authorize("admin"), createClass);
router.put("/:id", authenticate, authorize("admin"), updateClass);
router.delete("/:id", authenticate, authorize("admin"), deleteClass);

export default router;
