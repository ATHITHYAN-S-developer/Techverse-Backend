import express from "express";
import {
  getCourses,
  getCourseBySlug,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollInCourse,
  completeModule,
  getMyEnrollments,
} from "../controllers/courseController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { uploadCourseThumbnail } from "../utils/fileUpload.js";

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
router.get("/:slug", optionalAuth, getCourseBySlug);

router.post(
  "/",
  authenticate,
  authorize("teacher", "admin"),
  uploadCourseThumbnail.single("thumbnail"),
  createCourse
);

router.put(
  "/:id",
  authenticate,
  authorize("teacher", "admin"),
  uploadCourseThumbnail.single("thumbnail"),
  updateCourse
);

router.delete(
  "/:id",
  authenticate,
  authorize("teacher", "admin"),
  deleteCourse
);

router.post("/:id/enroll", authenticate, authorize("student"), enrollInCourse);
router.post("/:id/complete-module", authenticate, authorize("student"), completeModule);

export default router;
