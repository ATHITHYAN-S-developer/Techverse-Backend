import express from "express";
import {
  getPlacementEvents,
  getPlacementEventById,
  createPlacementEvent,
  updatePlacementEvent,
  deletePlacementEvent,
} from "../controllers/placementEventController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { uploadPlacementPoster, compressUploadedImages } from "../utils/fileUpload.js";

const router = express.Router();

router.get("/", getPlacementEvents);
router.get("/:id", getPlacementEventById);

router.post(
  "/",
  authenticate,
  authorize("teacher", "faculty", "hod", "admin"),
  uploadPlacementPoster.single("poster"),
  compressUploadedImages,
  createPlacementEvent
);

router.put(
  "/:id",
  authenticate,
  authorize("teacher", "faculty", "hod", "admin"),
  uploadPlacementPoster.single("poster"),
  compressUploadedImages,
  updatePlacementEvent
);

router.delete(
  "/:id",
  authenticate,
  authorize("teacher", "faculty", "hod", "admin"),
  deletePlacementEvent
);

export default router;
