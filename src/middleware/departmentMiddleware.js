import { Resource } from "../models/Resource.js";
import { Announcement } from "../models/Announcement.js";
import { Course } from "../models/Course.js";
import { CourseModule } from "../models/CourseModule.js";
import { Subject } from "../models/Subject.js";

/**
 * Normalize a department reference to its hex ObjectId string. Department ids
 * can be a raw ObjectId, a string, or a Mongoose-populated object
 * ({ _id, code, name }) after authMiddleware populates them - callers must not
 * blindly call .toString() on a populated object (that yields "[object Object]").
 */
const deptIdOf = (value) => {
  if (!value) return null;
  const id = value._id || value;
  return String(id);
};

/**
 * Ensures teachers can only create or mutate resources/announcements
 * belonging strictly to their assigned department.
 */
export function checkDepartmentAccess(resourceType = "body") {
  return async (req, res, next) => {
    try {
      // Admin has college-wide authority
      if (req.user?.role === "admin") {
        return next();
      }

      if (req.user?.role !== "teacher" && req.user?.role !== "faculty" && req.user?.role !== "hod") {
        return res.status(403).json({
          success: false,
          message: "Only faculty, HOD, or administrators can perform departmental modifications.",
          code: "ROLE_UNAUTHORIZED",
        });
      }

const teacherDeptId = deptIdOf(req.user.departmentId);

      if (!teacherDeptId) {
        return res.status(403).json({
          success: false,
          message: "Your faculty profile is not assigned to any academic department.",
          code: "NO_DEPARTMENT_ASSIGNED",
        });
      }

      // Check on Creation (from request body)
      if (resourceType === "body") {
        const targetDeptId = deptIdOf(req.body?.departmentId);
        if (targetDeptId && targetDeptId !== teacherDeptId) {
          return res.status(403).json({
            success: false,
            message: "Department Access Denied: Faculty cannot upload or modify resources for another department.",
            code: "DEPARTMENT_ACCESS_DENIED",
          });
        }
        return next();
      }

      // Check on Resource Modification (from database resource lookup)
      if (resourceType === "resource") {
        const resourceId = req.params.id;
        if (!resourceId || !/^[0-9a-fA-F]{24}$/.test(resourceId)) {
          return res.status(404).json({
            success: false,
            message: "Resource not found.",
            code: "RESOURCE_NOT_FOUND",
          });
        }
        const existing = await Resource.findById(resourceId);
        if (!existing) {
          return res.status(404).json({
            success: false,
            message: "Resource not found.",
            code: "RESOURCE_NOT_FOUND",
          });
        }

        if (existing.departmentId && deptIdOf(existing.departmentId) !== teacherDeptId) {
          return res.status(403).json({
            success: false,
            message: "Department Access Denied: You cannot modify a resource belonging to another department.",
            code: "DEPARTMENT_ACCESS_DENIED",
          });
        }

        // Faculty can only edit or delete resources they uploaded themselves
        if (existing.uploadedBy && existing.uploadedBy.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: "Permission Denied: You can only edit or delete resources you uploaded.",
            code: "RESOURCE_OWNER_DENIED",
          });
        }

        req.targetResource = existing;
        return next();
      }

      // Check on Announcement Modification (from database announcement lookup)
      if (resourceType === "announcement") {
        const announcementId = req.params.id;
        const existing = await Announcement.findById(announcementId);
        if (!existing) {
          return res.status(404).json({
            success: false,
            message: "Announcement not found.",
            code: "ANNOUNCEMENT_NOT_FOUND",
          });
        }

        // Teacher can only update their own announcement
        if (existing.createdBy && existing.createdBy.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: "Permission Denied: You can only edit or delete announcements you created.",
            code: "ANNOUNCEMENT_OWNER_DENIED",
          });
        }

        req.targetAnnouncement = existing;
        return next();
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export const enforceDepartmentMatch = checkDepartmentAccess("body");
export default checkDepartmentAccess;

/**
 * Resolve the acting teacher's department, rejecting unassigned faculty.
 * Admins always pass through. Returns null when the caller is not a teacher.
 */
function resolveTeacherDepartment(req, res) {
  // Admin has college-wide authority
  if (req.user?.role === "admin") {
    return { passed: true };
  }

  if (req.user?.role !== "teacher" && req.user?.role !== "faculty" && req.user?.role !== "hod") {
    res.status(403).json({
      success: false,
      message: "Only faculty, HOD, or administrators can perform departmental modifications.",
      code: "ROLE_UNAUTHORIZED",
    });
    return { passed: false };
  }

  const teacherDeptId = deptIdOf(req.user.departmentId);
  if (!teacherDeptId) {
    res.status(403).json({
      success: false,
      message: "Your faculty profile is not assigned to any academic department.",
      code: "NO_DEPARTMENT_ASSIGNED",
    });
    return { passed: false };
  }

  return { passed: true, teacherDeptId };
}

/**
 * Ensures only the assigned faculty member can create, edit, or delete
 * modules for a course. HOD is limited to their own department's courses;
 * admin has college-wide authority.
 */
export async function checkModuleCourseOwnership(req, res, next) {
  try {
    if (req.user?.role === "admin") {
      return next();
    }

    if (
      req.user?.role !== "teacher" &&
      req.user?.role !== "faculty" &&
      req.user?.role !== "hod"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only faculty, HOD, or administrators can modify course modules.",
        code: "ROLE_UNAUTHORIZED",
      });
    }

    // Resolve the module's course (from body on creation, from DB on modification)
    let courseId = req.body?.courseId ? req.body.courseId.toString() : null;
    if (req.params?.id && !courseId) {
      const existingModule = await CourseModule.findById(req.params.id);
      if (!existingModule) {
        return res.status(404).json({
          success: false,
          message: "Module not found.",
          code: "MODULE_NOT_FOUND",
        });
      }
      courseId = existingModule.courseId ? existingModule.courseId.toString() : null;
    }

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "A courseId is required to create a module.",
        code: "COURSE_ID_REQUIRED",
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
        code: "COURSE_NOT_FOUND",
      });
    }

    // Admin: full access. HOD: only their own department's courses.
    // Faculty: only courses explicitly assigned to them by the HOD/Admin.
    const isSuperAdmin = req.user.role === "admin";
    const isSameDeptHod =
      req.user.role === "hod" &&
      course.departmentId &&
      req.user.departmentId &&
      deptIdOf(course.departmentId) === deptIdOf(req.user.departmentId);
    const isAssignedFaculty =
      Boolean(course.assignedFacultyId) &&
      String(course.assignedFacultyId) === String(req.user._id);

    if (!isSuperAdmin && !isSameDeptHod && !isAssignedFaculty) {
      return res.status(403).json({
        success: false,
        message: "You can only manage modules of courses assigned to you by the HOD or Admin.",
        code: "COURSE_OWNERSHIP_DENIED",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Ensures teachers can only edit subjects belonging to their assigned department.
 * Admin has college-wide authority.
 */
export async function checkSubjectDepartment(req, res, next) {
  try {
    const result = resolveTeacherDepartment(req, res);
    if (!result.passed) return;
    if (result.teacherDeptId === undefined) return next(); // admin

    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found.",
        code: "SUBJECT_NOT_FOUND",
      });
    }

    if (subject.departmentId && deptIdOf(subject.departmentId) !== result.teacherDeptId) {
      return res.status(403).json({
        success: false,
        message: "Department Access Denied: You cannot modify a subject belonging to another department.",
        code: "DEPARTMENT_ACCESS_DENIED",
      });
    }

    // Teachers cannot re-assign a subject to another department
    const bodyDeptId = deptIdOf(req.body?.departmentId);
    if (bodyDeptId && bodyDeptId !== result.teacherDeptId) {
      return res.status(403).json({
        success: false,
        message: "Department Access Denied: Faculty cannot move subjects to another department.",
        code: "DEPARTMENT_ACCESS_DENIED",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}
