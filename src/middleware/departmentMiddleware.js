import { Resource } from "../models/Resource.js";
import { Announcement } from "../models/Announcement.js";

/**
 * Ensures teachers can only create or mutate resources/announcements
 * belonging strictly to their assigned department.
 */
export function checkDepartmentAccess(resourceType = "body") {
  return async (req, res, next) => {
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
  };
}

export const enforceDepartmentMatch = checkDepartmentAccess("body");
export default checkDepartmentAccess;
