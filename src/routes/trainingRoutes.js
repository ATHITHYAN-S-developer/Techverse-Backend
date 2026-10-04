import { Router } from "express";
import {
  getCompanies,
  getCompanyBySlug,
  createCompany,
  updateCompany,
  deleteCompany,
  createBootcamp,
  updateBootcamp,
  deleteBootcamp,
  createToolkit,
  updateToolkit,
  deleteToolkit,
  getAptitudeCategories,
  getTrainingOverview,
} from "../controllers/trainingController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = Router();

// Public read
router.get("/companies", getCompanies);
router.get("/companies/:slug", getCompanyBySlug);
router.get("/aptitude", getAptitudeCategories);
router.get("/overview", getTrainingOverview);

// Admin / Teacher Protected CRUD
router.post("/companies", authenticate, authorize("teacher", "admin"), createCompany);
router.put("/companies/:id", authenticate, authorize("teacher", "admin"), updateCompany);
router.delete("/companies/:id", authenticate, authorize("teacher", "admin"), deleteCompany);

router.post("/bootcamps", authenticate, authorize("teacher", "admin"), createBootcamp);
router.put("/bootcamps/:id", authenticate, authorize("teacher", "admin"), updateBootcamp);
router.delete("/bootcamps/:id", authenticate, authorize("teacher", "admin"), deleteBootcamp);

router.post("/toolkits", authenticate, authorize("teacher", "admin"), createToolkit);
router.put("/toolkits/:id", authenticate, authorize("teacher", "admin"), updateToolkit);
router.delete("/toolkits/:id", authenticate, authorize("teacher", "admin"), deleteToolkit);

export default router;
