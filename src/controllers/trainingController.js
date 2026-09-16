import { Company } from "../models/Company.js";
import { AptitudeCategory } from "../models/Aptitude.js";
import { TrainingTrack, Bootcamp, Toolkit } from "../models/Training.js";

export async function getCompanies(req, res, next) {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    res.json({ success: true, companies });
  } catch (err) {
    next(err);
  }
}

export async function getCompanyBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const company = await Company.findOne({ $or: [{ slug }, { _id: slug }] });
    if (!company) {
      return res.status(404).json({ success: false, message: "Company blueprint not found" });
    }
    res.json({ success: true, company });
  } catch (err) {
    next(err);
  }
}

export async function getAptitudeCategories(req, res, next) {
  try {
    const categories = await AptitudeCategory.find().sort({ createdAt: -1 });
    res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
}

export async function getTrainingOverview(req, res, next) {
  try {
    const [tracks, bootcamps, companies, toolkits] = await Promise.all([
      TrainingTrack.find(),
      Bootcamp.find(),
      Company.find(),
      Toolkit.find(),
    ]);

    res.json({
      success: true,
      tracks,
      bootcamps,
      companies,
      toolkits,
    });
  } catch (err) {
    next(err);
  }
}
