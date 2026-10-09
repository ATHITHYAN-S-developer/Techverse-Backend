import express from "express";
import {
  getTechPulsePosts,
  getTechPulseCount,
  getTechPulseAdminPosts,
  getTechPulsePostById,
  createTechPulsePost,
  updateTechPulsePost,
  deleteTechPulsePost,
} from "../controllers/techPulseController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { handleTechPulseUpload } from "../utils/fileUpload.js";

const router = express.Router();

router.get("/", getTechPulsePosts);
router.get("/count", getTechPulseCount);
router.get("/admin", authenticate, authorize("admin"), getTechPulseAdminPosts);

router.post("/", authenticate, authorize("admin"), handleTechPulseUpload, createTechPulsePost);

router.get("/:id", getTechPulsePostById);
router.put("/:id", authenticate, authorize("admin"), handleTechPulseUpload, updateTechPulsePost);
router.delete("/:id", authenticate, authorize("admin"), deleteTechPulsePost);

export default router;
