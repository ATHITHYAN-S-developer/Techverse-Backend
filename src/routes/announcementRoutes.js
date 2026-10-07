import express from "express";
import {
  getAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleLikeAnnouncement,
} from "../controllers/announcementController.js";
import { authenticate, optionalAuth } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { handleAnnouncementUpload } from "../utils/fileUpload.js";

const router = express.Router();

router.get("/", getAnnouncements);
router.get("/:id", getAnnouncementById);
router.post("/:id/like", optionalAuth, toggleLikeAnnouncement);

router.post(
  "/",
  authenticate,
  authorize("teacher", "faculty", "hod", "admin"),
  handleAnnouncementUpload,
  createAnnouncement
);

router.put(
  "/:id",
  authenticate,
  authorize("teacher", "faculty", "hod", "admin"),
  handleAnnouncementUpload,
  updateAnnouncement
);

router.delete(
  "/:id",
  authenticate,
  authorize("teacher", "faculty", "hod", "admin"),
  deleteAnnouncement
);

export default router;
