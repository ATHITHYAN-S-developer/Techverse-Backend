import { Subject } from "../models/Subject.js";
import { Resource } from "../models/Resource.js";

/**
 * @route   GET /api/subjects
 * @desc    Get subjects filtered by department, semester, year
 * @access  Public
 */
export async function getSubjects(req, res, next) {
  try {
    const { departmentId, semester, year } = req.query;
    const query = { isActive: true };

    if (departmentId) query.departmentId = departmentId;
    if (semester) query.semester = Number(semester);
    if (year) query.year = Number(year);

    const subjects = await Subject.find(query)
      .populate("departmentId", "code name")
      .populate("assignedTeachers", "name staffId email")
      .sort({ semester: 1, code: 1 });

    // Include resource count for each subject
    const subjectsWithStats = await Promise.all(
      subjects.map(async (subj) => {
        const resourceCount = await Resource.countDocuments({ subjectId: subj._id, status: "active" });
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

    const resources = await Resource.find({ subjectId: subject._id, status: "active" })
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
    const { _id, code, name, departmentId, semester, year, credits, regulation, description } = req.body;

    const subjectId = _id || `${departmentId}_${code}`.toLowerCase().replace(/\s+/g, "_");
    const existing = await Subject.findById(subjectId);
    if (existing) {
      return res.status(400).json({ success: false, message: "Subject with this code already exists." });
    }

    const newSubject = await Subject.create({
      _id: subjectId,
      code: code.toUpperCase(),
      name,
      departmentId,
      semester,
      year,
      credits,
      regulation,
      description,
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
 * @desc    Update subject
 * @access  Protected (Admin / Teacher in department)
 */
export async function updateSubject(req, res, next) {
  try {
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
 * @desc    Deactivate subject
 * @access  Protected (Admin only)
 */
export async function deleteSubject(req, res, next) {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found." });
    }
    res.json({ success: true, message: "Subject deactivated." });
  } catch (error) {
    next(error);
  }
}
