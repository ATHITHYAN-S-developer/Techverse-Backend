import express from "express";
import {
  getAllCertificates,
  getMyCertificates,
  verifyCertificate,
  claimCertificate,
  getCertificateById,
  toggleCertificateStatus,
} from "../controllers/certificateController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", getAllCertificates);
router.get("/verify/:code", verifyCertificate);
router.get("/my", authenticate, authorize("student"), getMyCertificates);
router.post("/claim", authenticate, authorize("student"), claimCertificate);
router.put("/:id/status", authenticate, authorize("admin"), toggleCertificateStatus);
router.get("/:id", getCertificateById);

export default router;
