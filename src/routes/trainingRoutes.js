import { Router } from "express";
import {
  getCompanies,
  getCompanyBySlug,
  getAptitudeCategories,
  getTrainingOverview,
} from "../controllers/trainingController.js";

const router = Router();

router.get("/companies", getCompanies);
router.get("/companies/:slug", getCompanyBySlug);
router.get("/aptitude", getAptitudeCategories);
router.get("/overview", getTrainingOverview);

export default router;
