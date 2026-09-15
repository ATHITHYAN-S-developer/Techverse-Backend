import { Department } from "../models/Department.js";
import { User } from "../models/User.js";
import { Subject } from "../models/Subject.js";
import { Resource } from "../models/Resource.js";
import { logAuditEvent } from "../services/auditService.js";

/**
 * @route   GET /api/departments
 * @desc    Get all active academic departments
 * @access  Public
 */
export async function getAllDepartments(req, res, next) {
  try {
    const departments = await Department.find({ isActive: true }).sort({ name: 1 });

    // Populate extra metrics for departments
    const departmentsWithStats = await Promise.all(
      departments.map(async (dept) => {
        const [studentCount, teacherCount, resourceCount, subjectCount] = await Promise.all([
          User.countDocuments({ departmentId: dept._id, role: "student", isActive: true }),
          User.countDocuments({ departmentId: dept._id, role: "teacher", isActive: true }),
          Resource.countDocuments({ departmentId: dept._id, status: "active" }),
          Subject.countDocuments({ departmentId: dept._id, isActive: true }),
        ]);

        return {
          ...dept.toObject(),
          stats: {
            students: studentCount,
            teachers: teacherCount,
            resources: resourceCount,
            subjects: subjectCount,
          },
        };
      })
    );

    res.json({
      success: true,
      departments: departmentsWithStats,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/departments/:id
 * @desc    Get department by ID or Code
 * @access  Public
 */
export async function getDepartmentById(req, res, next) {
  try {
    const { id } = req.params;
    const department = await Department.findOne({
      $or: [{ _id: id }, { code: id.toUpperCase() }],
      isActive: true,
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    res.json({
      success: true,
      department,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/departments
 * @desc    Create new department
 * @access  Protected (Admin only)
 */
export async function createDepartment(req, res, next) {
  try {
    const { _id, code, name, description, icon, color } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: "Department code and name are required.",
      });
    }

    const deptId = _id || code.toLowerCase();
    const existing = await Department.findById(deptId);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Department with this ID or Code already exists.",
      });
    }

    const department = await Department.create({
      _id: deptId,
      code: code.toUpperCase(),
      name,
      description,
      icon,
      color,
    });

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "CREATE",
      resourceType: "Department",
      resourceId: department._id,
      details: `Created department ${department.name} (${department.code})`,
    });

    res.status(201).json({
      success: true,
      message: "Department created successfully.",
      department,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/departments/:id
 * @desc    Update department
 * @access  Protected (Admin only)
 */
export async function updateDepartment(req, res, next) {
  try {
    const { id } = req.params;
    const department = await Department.findByIdAndUpdate(id, req.body, { new: true });

    if (!department) {
      return res.status(404).json({ success: false, message: "Department not found." });
    }

    res.json({
      success: true,
      message: "Department updated successfully.",
      department,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/departments/:id
 * @desc    Soft delete department
 * @access  Protected (Admin only)
 */
export async function deleteDepartment(req, res, next) {
  try {
    const { id } = req.params;
    const department = await Department.findByIdAndUpdate(id, { isActive: false }, { new: true });

    if (!department) {
      return res.status(404).json({ success: false, message: "Department not found." });
    }

    res.json({
      success: true,
      message: "Department deactivated successfully.",
    });
  } catch (error) {
    next(error);
  }
}
