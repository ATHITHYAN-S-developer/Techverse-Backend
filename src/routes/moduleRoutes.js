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
import { checkModuleDepartment } from "../middleware/departmentMiddleware.js";

const router = express.Router();

router.get("/", getModules);
router.get("/:id", getModuleById);
router.post("/:id/submit-quiz", authenticate, submitModuleQuiz);
router.post("/", authenticate, authorize("teacher", "admin"), checkModuleDepartment, createModule);
router.put("/:id", authenticate, authorize("teacher", "admin"), checkModuleDepartment, updateModule);
router.delete("/:id", authenticate, authorize("teacher", "admin"), checkModuleDepartment, deleteModule);

export default router;
