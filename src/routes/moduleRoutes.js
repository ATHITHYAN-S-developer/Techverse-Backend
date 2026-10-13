import express from "express";
import {
  getModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
  submitModuleQuiz,
  runModuleCodeDirect,
} from "../controllers/moduleController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { checkModuleCourseOwnership } from "../middleware/departmentMiddleware.js";

const router = express.Router();

router.get("/", getModules);
router.get("/:id", getModuleById);
router.post("/:moduleId/run-code", authenticate, runModuleCodeDirect);
router.post("/:id/submit-quiz", authenticate, submitModuleQuiz);
router.post("/", authenticate, authorize("faculty", "teacher", "hod", "admin"), checkModuleCourseOwnership, createModule);
router.put("/:id", authenticate, authorize("faculty", "teacher", "hod", "admin"), checkModuleCourseOwnership, updateModule);
router.delete("/:id", authenticate, authorize("faculty", "teacher", "hod", "admin"), checkModuleCourseOwnership, deleteModule);

export default router;
