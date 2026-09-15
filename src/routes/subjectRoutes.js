import express from "express";
import {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
} from "../controllers/subjectController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { enforceDepartmentMatch } from "../middleware/departmentMiddleware.js";

const router = express.Router();

router.get("/", getSubjects);
router.get("/:id", getSubjectById);
router.post("/", authenticate, authorize("teacher", "admin"), enforceDepartmentMatch, createSubject);
router.put("/:id", authenticate, authorize("teacher", "admin"), updateSubject);
router.delete("/:id", authenticate, authorize("admin"), deleteSubject);

export default router;
