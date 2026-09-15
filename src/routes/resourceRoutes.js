import express from "express";
import {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  trackDownload,
} from "../controllers/resourceController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { enforceDepartmentMatch } from "../middleware/departmentMiddleware.js";
import { upload } from "../utils/fileUpload.js";

const router = express.Router();

router.get("/", getResources);
router.get("/:id", getResourceById);
router.post(
  "/",
  authenticate,
  authorize("teacher", "admin"),
  upload.single("file"),
  enforceDepartmentMatch,
  createResource
);
router.put("/:id", authenticate, authorize("teacher", "admin"), updateResource);
router.delete("/:id", authenticate, authorize("teacher", "admin"), deleteResource);
router.post("/:id/download", trackDownload);

export default router;
