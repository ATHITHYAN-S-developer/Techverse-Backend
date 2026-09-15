import { Class } from "../models/Class.js";

/**
 * @route   GET /api/classes
 * @desc    Get classes filtered by department, year, semester
 * @access  Public / Protected
 */
export async function getClasses(req, res, next) {
  try {
    const { departmentId, year, semester } = req.query;
    const query = { isActive: true };

    if (departmentId) query.departmentId = departmentId;
    if (year) query.year = Number(year);
    if (semester) query.semester = Number(semester);

    const classes = await Class.find(query)
      .populate("departmentId", "code name")
      .sort({ departmentId: 1, year: 1, section: 1 });

    res.json({
      success: true,
      classes,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/classes/:id
 * @desc    Get single class by ID
 * @access  Public / Protected
 */
export async function getClassById(req, res, next) {
  try {
    const classItem = await Class.findById(req.params.id).populate("departmentId", "code name");
    if (!classItem) {
      return res.status(404).json({ success: false, message: "Class not found." });
    }
    res.json({ success: true, class: classItem });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/classes
 * @desc    Create new class
 * @access  Protected (Admin only)
 */
export async function createClass(req, res, next) {
  try {
    const { _id, name, departmentId, year, semester, section } = req.body;
    const classId = _id || `${departmentId}_${year}${section}`.toLowerCase();

    const existing = await Class.findById(classId);
    if (existing) {
      return res.status(400).json({ success: false, message: "Class ID already exists." });
    }

    const newClass = await Class.create({
      _id: classId,
      name,
      departmentId,
      year,
      semester,
      section,
    });

    res.status(201).json({ success: true, message: "Class created successfully.", class: newClass });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/classes/:id
 * @desc    Update class
 * @access  Protected (Admin only)
 */
export async function updateClass(req, res, next) {
  try {
    const updatedClass = await Class.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedClass) {
      return res.status(404).json({ success: false, message: "Class not found." });
    }
    res.json({ success: true, message: "Class updated.", class: updatedClass });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/classes/:id
 * @desc    Deactivate class
 * @access  Protected (Admin only)
 */
export async function deleteClass(req, res, next) {
  try {
    const updatedClass = await Class.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!updatedClass) {
      return res.status(404).json({ success: false, message: "Class not found." });
    }
    res.json({ success: true, message: "Class deactivated." });
  } catch (error) {
    next(error);
  }
}
