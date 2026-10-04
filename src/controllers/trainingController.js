import { Company } from "../models/Company.js";
import { AptitudeCategory } from "../models/Aptitude.js";
import { TrainingTrack, Bootcamp, Toolkit } from "../models/Training.js";
import { logAuditEvent } from "../services/auditService.js";

// --- Companies ---
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

export async function createCompany(req, res, next) {
  try {
    const {
      name,
      slug,
      logo,
      tagline,
      packageRange,
      salary,
      role,
      eligibility,
      description,
      rounds,
      sampleQuestions,
      pattern,
      testLink,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Company name is required." });
    }

    const companySlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newCompany = await Company.create({
      name,
      slug: companySlug,
      logo: logo || "",
      tagline: tagline || "",
      packageRange: packageRange || "",
      salary: salary || packageRange || "",
      role: role || "",
      eligibility: eligibility || "",
      description: description || "",
      rounds: Array.isArray(rounds) ? rounds : [],
      sampleQuestions: Array.isArray(sampleQuestions) ? sampleQuestions : [],
      pattern: pattern || "",
      testLink: testLink || "",
    });

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "CREATE",
      resourceType: "Company",
      resourceId: newCompany._id.toString(),
      details: `Created company blueprint '${newCompany.name}'`,
    });

    res.status(201).json({ success: true, company: newCompany });
  } catch (err) {
    next(err);
  }
}

export async function updateCompany(req, res, next) {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found." });
    }

    Object.assign(company, req.body);
    await company.save();

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "UPDATE",
      resourceType: "Company",
      resourceId: company._id.toString(),
      details: `Updated company blueprint '${company.name}'`,
    });

    res.json({ success: true, company });
  } catch (err) {
    next(err);
  }
}

export async function deleteCompany(req, res, next) {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found." });
    }

    await Company.findByIdAndDelete(req.params.id);

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "DELETE",
      resourceType: "Company",
      resourceId: req.params.id,
      details: `Deleted company blueprint '${company.name}'`,
    });

    res.json({ success: true, message: "Company blueprint removed." });
  } catch (err) {
    next(err);
  }
}

// --- Bootcamps ---
export async function createBootcamp(req, res, next) {
  try {
    const { title, trainer, date, time, mode, eligible, seats, status, tags } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: "Bootcamp title is required." });
    }

    const bootcampId = `bootcamp-${Date.now()}`;
    const bootcamp = await Bootcamp.create({
      bootcampId,
      title,
      trainer: trainer || "",
      date: date || "",
      time: time || "",
      mode: mode || "Hybrid",
      eligible: eligible || "All Final & Pre-Final Years",
      seats: seats || "Limited Seats",
      status: status || "Registration Open",
      tags: Array.isArray(tags) ? tags : [],
    });

    res.status(201).json({ success: true, bootcamp });
  } catch (err) {
    next(err);
  }
}

export async function updateBootcamp(req, res, next) {
  try {
    const bootcamp = await Bootcamp.findById(req.params.id);
    if (!bootcamp) {
      return res.status(404).json({ success: false, message: "Bootcamp not found." });
    }
    Object.assign(bootcamp, req.body);
    await bootcamp.save();
    res.json({ success: true, bootcamp });
  } catch (err) {
    next(err);
  }
}

export async function deleteBootcamp(req, res, next) {
  try {
    await Bootcamp.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Bootcamp deleted." });
  } catch (err) {
    next(err);
  }
}

// --- Toolkits ---
export async function createToolkit(req, res, next) {
  try {
    const { title, category, size, downloads, url, desc } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: "Toolkit title is required." });
    }
    const toolkit = await Toolkit.create({
      title,
      category: category || "Cheat Sheet",
      size: size || "2.5 MB",
      downloads: downloads || "1.2k+ Downloads",
      url: url || "",
      desc: desc || "",
    });
    res.status(201).json({ success: true, toolkit });
  } catch (err) {
    next(err);
  }
}

export async function updateToolkit(req, res, next) {
  try {
    const toolkit = await Toolkit.findById(req.params.id);
    if (!toolkit) {
      return res.status(404).json({ success: false, message: "Toolkit not found." });
    }
    Object.assign(toolkit, req.body);
    await toolkit.save();
    res.json({ success: true, toolkit });
  } catch (err) {
    next(err);
  }
}

export async function deleteToolkit(req, res, next) {
  try {
    await Toolkit.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Toolkit removed." });
  } catch (err) {
    next(err);
  }
}

// --- Aptitude & Overview ---
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
      TrainingTrack.find().sort({ createdAt: -1 }),
      Bootcamp.find().sort({ createdAt: -1 }),
      Company.find().sort({ createdAt: -1 }),
      Toolkit.find().sort({ createdAt: -1 }),
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
