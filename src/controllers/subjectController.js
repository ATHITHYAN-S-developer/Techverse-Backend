import { Subject } from "../models/Subject.js";
import { Resource } from "../models/Resource.js";
import { Department } from "../models/Department.js";
import { logAuditEvent } from "../services/auditService.js";
import { removeResourceFiles } from "../utils/resourceFiles.js";

/**
 * @route   GET /api/subjects
 * @desc    Get subjects filtered by department, semester, year
 * @access  Public (admin passes ?all=true to include inactive)
 */
export async function getSubjects(req, res, next) {
  try {
    const { departmentId, semester, year, all } = req.query;
    const includeAll = all === "true";
    const query = {};

    if (departmentId) query.departmentId = departmentId;
    if (semester) query.semester = Number(semester);
    if (year) query.year = Number(year);

    if (!includeAll) {
      query.isActive = true;
      // Hide subjects belonging to deactivated departments on public listings
      const activeDeptIds = await Department.find({ isActive: true }).distinct("_id");
      query.departmentId = departmentId || { $in: activeDeptIds };
    }

    const subjects = await Subject.find(query)
      .populate("departmentId", "code name")
      .populate("assignedTeachers", "name staffId email")
      .sort({ semester: 1, code: 1 });

    // Include resource count for each subject
    const subjectsWithStats = await Promise.all(
      subjects.map(async (subj) => {
        const resourceCount = await Resource.countDocuments({ subjectId: subj._id, isPublished: true });
        return {
          ...subj.toObject(),
          resourceCount,
        };
      })
    );

    res.json({
      success: true,
      subjects: subjectsWithStats,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/subjects/:id
 * @desc    Get single subject with assigned teachers and resources
 * @access  Public
 */
export async function getSubjectById(req, res, next) {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate("departmentId", "code name")
      .populate("assignedTeachers", "name staffId email profileImage");

    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found." });
    }

    const resources = await Resource.find({ subjectId: subject._id, isPublished: true })
      .populate("uploadedBy", "name staffId")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      subject,
      resources,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/subjects
 * @desc    Create new subject
 * @access  Protected (Admin / Teacher)
 */
export async function createSubject(req, res, next) {
  try {
    const { code, name, departmentId, semester, year, credits, description } = req.body;

    if (!code || !name || !departmentId) {
      return res.status(400).json({
        success: false,
        message: "Subject code, name and department are required.",
      });
    }

    const existing = await Subject.findOne({ departmentId, code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Subject with this code already exists." });
    }

    const newSubject = await Subject.create({
      code: code.toUpperCase(),
      name,
      departmentId,
      semester,
      year,
      credits,
      description,
      createdBy: req.user?._id,
    });

    res.status(201).json({
      success: true,
      message: "Subject created successfully.",
      subject: newSubject,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/subjects/:id
 * @desc    Update subject (admin-wide; teacher scoped by department middleware)
 * @access  Protected (Admin / Teacher in department)
 */
export async function updateSubject(req, res, next) {
  try {
    if (req.body.code) req.body.code = req.body.code.toUpperCase();

    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found." });
    }
    res.json({ success: true, message: "Subject updated.", subject });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/subjects/:id
 * @desc    Hard delete subject with its resources and stored files
 * @access  Protected (Admin only)
 */
export async function deleteSubject(req, res, next) {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found." });
    }

    const resources = await Resource.find({ subjectId: subject._id });
    removeResourceFiles(resources);
    await Resource.deleteMany({ subjectId: subject._id });
    await subject.deleteOne();

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "DELETE",
      resourceType: "Subject",
      resourceId: subject._id,
      details: `Permanently deleted subject ${subject.name} (${subject.code}) with ${resources.length} resources`,
    });

    res.json({
      success: true,
      message: "Subject permanently deleted along with its resources.",
    });
  } catch (error) {
    next(error);
  }
}