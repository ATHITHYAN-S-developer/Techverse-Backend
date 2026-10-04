import express from "express";
import {
  getAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/announcementController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { handleAnnouncementUpload } from "../utils/fileUpload.js";

const router = express.Router();

router.get("/", getAnnouncements);
router.get("/:id", getAnnouncementById);

router.post(
  "/",
  authenticate,
  authorize("teacher", "admin"),
  handleAnnouncementUpload,
  createAnnouncement
);

router.put(
  "/:id",
  authenticate,
  authorize("teacher", "admin"),
  handleAnnouncementUpload,
  updateAnnouncement
);

router.delete(
  "/:id",
  authenticate,
  authorize("teacher", "admin"),
  deleteAnnouncement
);

export default router;
