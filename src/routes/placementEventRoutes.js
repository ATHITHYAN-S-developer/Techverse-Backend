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
import { uploadPlacementPoster } from "../utils/fileUpload.js";

const router = express.Router();

router.get("/", getPlacementEvents);
router.get("/:id", getPlacementEventById);

router.post(
  "/",
  authenticate,
  authorize("teacher", "admin"),
  uploadPlacementPoster.single("poster"),
  createPlacementEvent
);

router.put(
  "/:id",
  authenticate,
  authorize("teacher", "admin"),
  uploadPlacementPoster.single("poster"),
  updatePlacementEvent
);

router.delete(
  "/:id",
  authenticate,
  authorize("teacher", "admin"),
  deletePlacementEvent
);

export default router;
