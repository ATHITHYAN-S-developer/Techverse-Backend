import express from "express";
import {
  getModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
  submitModuleQuiz,
} from "../controllers/moduleController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", getModules);
router.get("/:id", getModuleById);
router.post("/:id/submit-quiz", authenticate, submitModuleQuiz);
router.post("/", authenticate, authorize("teacher", "admin"), createModule);
router.put("/:id", authenticate, authorize("teacher", "admin"), updateModule);
router.delete("/:id", authenticate, authorize("teacher", "admin"), deleteModule);

export default router;
