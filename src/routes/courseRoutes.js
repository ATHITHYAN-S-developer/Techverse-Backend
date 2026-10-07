import express from "express";
import {
  getCourses,
  getMyCourses,
  getCourseBySlug,
  createCourse,
  updateCourse,
  deleteCourse,
  togglePublishStatus,
  enrollInCourse,
  completeModule,
  getMyEnrollments,
  recordVideoProgressHandler,
  getModuleProgressionHandler,
  getCourseProgressionHandler,
  submitModuleTestHandler,
  getDepartmentFaculty,
} from "../controllers/courseController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { uploadCourseThumbnail, compressUploadedImages } from "../utils/fileUpload.js";

const router = express.Router();

const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    authenticate(req, res, () => next());
  } else {
    next();
  }
};

router.get("/", optionalAuth, getCourses);
router.get("/my/enrollments", authenticate, authorize("student"), getMyEnrollments);
router.get("/my", authenticate, authorize("faculty", "teacher", "hod", "admin"), getMyCourses);
router.get("/department-faculty", authenticate, authorize("hod", "admin"), getDepartmentFaculty);
router.get("/:slug/progression", authenticate, getCourseProgressionHandler);
router.get("/:slug/modules/:moduleId/progression", authenticate, getModuleProgressionHandler);
router.post("/:slug/modules/:moduleId/video-progress", authenticate, recordVideoProgressHandler);
router.post("/:slug/modules/:moduleId/submit-test", authenticate, submitModuleTestHandler);
router.get("/:slug", optionalAuth, getCourseBySlug);

router.post(
  "/",
  authenticate,
  authorize("hod", "admin"),
  uploadCourseThumbnail.single("thumbnail"),
  compressUploadedImages,
  createCourse
);

router.patch(
  "/:id/publish-status",
  authenticate,
  authorize("hod", "admin"),
  togglePublishStatus
);
router.put(
  "/:id/publish-status",
  authenticate,
  authorize("hod", "admin"),
  togglePublishStatus
);
router.post(
  "/:id/publish-status",
  authenticate,
  authorize("hod", "admin"),
  togglePublishStatus
);

router.put(
  "/:id",
  authenticate,
  authorize("hod", "admin"),
  uploadCourseThumbnail.single("thumbnail"),
  compressUploadedImages,
  updateCourse
);

router.delete(
  "/:id",
  authenticate,
  authorize("hod", "admin"),
  deleteCourse
);

router.post("/:id/enroll", authenticate, authorize("student"), enrollInCourse);
router.post("/:id/complete-module", authenticate, authorize("student"), completeModule);

export default router;
