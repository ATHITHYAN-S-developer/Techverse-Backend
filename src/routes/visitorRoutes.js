import express from "express";
import {
  incrementVisitor,
  incrementVisitorType,
  getVisitorCount,
  trackVisit,
  getVisitorStats,
} from "../controllers/visitorController.js";

const router = express.Router();

// Core Visitor Counter Routes
router.post("/increment", incrementVisitor);
router.get("/count", getVisitorCount);

// Backward Compatibility Routes
// NOTE: these must be registered before "/:type", otherwise the dynamic
// segment swallows "/track" and rejects it as an unknown visitor type.
router.post("/track", trackVisit);
router.get("/stats", getVisitorStats);

// Per-type daily counters: /resource, /course, /announcement
router.post("/:type", incrementVisitorType);

export default router;
