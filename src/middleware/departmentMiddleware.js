import { Resource } from "../models/Resource.js";
import { Announcement } from "../models/Announcement.js";
import { Course } from "../models/Course.js";
import { CourseModule } from "../models/CourseModule.js";
import { Subject } from "../models/Subject.js";

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

      if (req.user?.role !== "teacher") {
        return res.status(403).json({
          success: false,
          message: "Only faculty or administrators can perform departmental modifications.",
          code: "ROLE_UNAUTHORIZED",
        });
      }

      const teacherDeptId = req.user.departmentId ? req.user.departmentId.toString() : null;

      if (!teacherDeptId) {
        return res.status(403).json({
          success: false,
          message: "Your faculty profile is not assigned to any academic department.",
          code: "NO_DEPARTMENT_ASSIGNED",
        });
      }

      // Check on Creation (from request body)
      if (resourceType === "body") {
        const targetDeptId = req.body?.departmentId ? req.body.departmentId.toString() : null;
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

        if (existing.departmentId && existing.departmentId.toString() !== teacherDeptId) {
          return res.status(403).json({
            success: false,
            message: "Department Access Denied: You cannot modify a resource belonging to another department.",
            code: "DEPARTMENT_ACCESS_DENIED",
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

  if (req.user?.role !== "teacher") {
    res.status(403).json({
      success: false,
      message: "Only faculty or administrators can perform departmental modifications.",
      code: "ROLE_UNAUTHORIZED",
    });
    return { passed: false };
  }

  const teacherDeptId = req.user.departmentId ? req.user.departmentId.toString() : null;
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
 * Ensures teachers can only create, edit, or delete courses
 * belonging strictly to their assigned department.
 * Admin has college-wide authority.
 */
export async function checkCourseDepartment(req, res, next) {
  try {
    const result = resolveTeacherDepartment(req, res);
    if (!result.passed) return;
    if (result.teacherDeptId === undefined) return next(); // admin

    // Check on Creation: a client-supplied department must match the teacher's
    const bodyDeptId = req.body?.departmentId ? req.body.departmentId.toString() : null;
    if (bodyDeptId && bodyDeptId !== result.teacherDeptId) {
      return res.status(403).json({
        success: false,
        message: "Department Access Denied: Faculty cannot create courses for another department.",
        code: "DEPARTMENT_ACCESS_DENIED",
      });
    }

    // Check on Modification (from database course lookup)
    if (req.params?.id) {
      const existing = await Course.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Course not found.",
          code: "COURSE_NOT_FOUND",
        });
      }
      if (existing.departmentId && existing.departmentId.toString() !== result.teacherDeptId) {
        return res.status(403).json({
          success: false,
          message: "Department Access Denied: You cannot modify a course belonging to another department.",
          code: "DEPARTMENT_ACCESS_DENIED",
        });
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Ensures teachers can only create, edit, or delete modules for courses
 * assigned to or created by themselves. Admin has college-wide authority.
 */
export async function checkModuleCourseOwnership(req, res, next) {
  try {
    if (req.user?.role === "admin") {
      return next();
    }

    if (req.user?.role !== "teacher") {
      return res.status(403).json({
        success: false,
        message: "Only faculty or administrators can modify course modules.",
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

    const isOwner =
      (course.assignedFacultyId && course.assignedFacultyId.toString() === req.user._id.toString()) ||
      (course.createdBy && course.createdBy.toString() === req.user._id.toString());

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "You can only manage modules for courses assigned to or created by yourself.",
        code: "COURSE_OWNERSHIP_DENIED",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Ensures teachers can only create, edit, or delete modules belonging
 * to courses within their assigned department.
 * Admin has college-wide authority.
 */
export async function checkModuleDepartment(req, res, next) {
  try {
    const result = resolveTeacherDepartment(req, res);
    if (!result.passed) return;
    if (result.teacherDeptId === undefined) return next(); // admin

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

    if (courseId) {
      const course = await Course.findById(courseId);
      if (course && course.departmentId && course.departmentId.toString() !== result.teacherDeptId) {
        return res.status(403).json({
          success: false,
          message: "Department Access Denied: You can only manage modules within your assigned department.",
          code: "DEPARTMENT_ACCESS_DENIED",
        });
      }
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

    if (subject.departmentId && subject.departmentId.toString() !== result.teacherDeptId) {
      return res.status(403).json({
        success: false,
        message: "Department Access Denied: You cannot modify a subject belonging to another department.",
        code: "DEPARTMENT_ACCESS_DENIED",
      });
    }

    // Teachers cannot re-assign a subject to another department
    const bodyDeptId = req.body?.departmentId ? req.body.departmentId.toString() : null;
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
