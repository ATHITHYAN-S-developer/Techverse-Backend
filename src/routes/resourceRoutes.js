import express from "express";
import {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  trackDownload,
  approveResource,
  rejectResource,
  viewResourceFile,
} from "../controllers/resourceController.js";
import { authenticate, optionalAuth } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { enforceDepartmentMatch, checkDepartmentAccess } from "../middleware/departmentMiddleware.js";
import { uploadResourceFile, compressUploadedImages } from "../utils/fileUpload.js";

const router = express.Router();

router.get("/", optionalAuth, getResources);
router.get("/:id/view", optionalAuth, viewResourceFile);
router.get("/:id", optionalAuth, getResourceById);
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
router.patch(
  "/:id/approve",
  authenticate,
  authorize("faculty", "teacher", "hod", "admin"),
  approveResource
);
router.post(
  "/:id/approve",
  authenticate,
  authorize("faculty", "teacher", "hod", "admin"),
  approveResource
);
router.put(
  "/:id/approve",
  authenticate,
  authorize("faculty", "teacher", "hod", "admin"),
  approveResource
);
router.patch(
  "/:id/reject",
  authenticate,
  authorize("faculty", "teacher", "hod", "admin"),
  rejectResource
);
router.post(
  "/:id/reject",
  authenticate,
  authorize("faculty", "teacher", "hod", "admin"),
  rejectResource
);
router.put(
  "/:id/reject",
  authenticate,
  authorize("faculty", "teacher", "hod", "admin"),
  rejectResource
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
