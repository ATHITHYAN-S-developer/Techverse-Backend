import express from "express";
import { getAuditLogs } from "../controllers/auditController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", authenticate, authorize("admin"), getAuditLogs);

export default router;
