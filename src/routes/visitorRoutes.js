import express from "express";
import {
  incrementVisitor,
  getVisitorCount,
  trackVisit,
  getVisitorStats,
} from "../controllers/visitorController.js";

const router = express.Router();

// Core Visitor Counter Routes
router.post("/increment", incrementVisitor);
router.get("/count", getVisitorCount);

// Backward Compatibility Routes
router.post("/track", trackVisit);
router.get("/stats", getVisitorStats);

export default router;
