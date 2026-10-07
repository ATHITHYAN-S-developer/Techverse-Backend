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
import { enforceDepartmentMatch, checkDepartmentAccess } from "../middleware/departmentMiddleware.js";
import { uploadResourceFile, compressUploadedImages } from "../utils/fileUpload.js";

const router = express.Router();

router.get("/", getResources);
router.get("/:id", getResourceById);
router.post(
  "/",
  authenticate,
  authorize("faculty", "teacher", "hod", "admin"),
  uploadResourceFile.single("file"),
  compressUploadedImages,
  enforceDepartmentMatch,
  createResource
);
router.put(
  "/:id",
  authenticate,
  authorize("faculty", "teacher", "hod", "admin"),
  checkDepartmentAccess("resource"),
  uploadResourceFile.single("file"),
  compressUploadedImages,
  updateResource
);
router.delete(
  "/:id",
  authenticate,
  authorize("faculty", "teacher", "hod", "admin"),
  checkDepartmentAccess("resource"),
  deleteResource
);
router.post("/:id/download", trackDownload);

export default router;
