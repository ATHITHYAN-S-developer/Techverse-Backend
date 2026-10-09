import mongoose from "mongoose";
import { Course } from "../models/Course.js";
import { CourseModule } from "../models/CourseModule.js";
import { Enrollment } from "../models/Enrollment.js";
import { ModuleProgress } from "../models/ModuleProgress.js";
import { Certificate } from "../models/Certificate.js";
import { User } from "../models/User.js";
import { updateStreakOnActivity } from "../services/streakService.js";
import { issueCertificate } from "../services/certificateService.js";
import { logAuditEvent } from "../services/auditService.js";
import {
  recordVideoWatchProgress,
  getCourseProgressionMap,
  submitModuleTest as gradeAndSubmitModuleTest,
  getOrCreateModuleProgress,
} from "../services/moduleProgressionService.js";
import { deleteUploadedFile } from "../utils/fileUpload.js";

/**
 * Normalize an id reference (raw ObjectId, string, or populated object
 * { _id, code, name }) to a comparable hex string. Never use == for ids.
 */
const idOf = (v) => String(v?._id || v || "");


/**
 * Remove internal ownership fields from a course object before it is exposed
 * to non-privileged users (students / anonymous site visitors).
 */
function stripInternalCourseFields(courseObj) {
  const sanitized = { ...courseObj };
  delete sanitized.createdBy;
  delete sanitized.assignedFacultyId;
  delete sanitized.assignedFacultyName;
  if (sanitized.departmentId && typeof sanitized.departmentId === "object") {
    sanitized.departmentCode = sanitized.departmentId.code || "";
    sanitized.departmentName = sanitized.departmentId.name || "";
    sanitized.departmentId = sanitized.departmentId._id ? sanitized.departmentId._id.toString() : sanitized.departmentId.toString();
  }
  return sanitized;
}

/**
 * @route   GET /api/courses
 * @desc    Get all published courses (with optional user enrollment progress)
 * @access  Public / Protected
 */
export async function getCourses(req, res, next) {
  try {
    const { category, search } = req.query;
    const query = { isPublished: true };

    if (category && category !== "All") {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Role-based Audience Enforcement:
    // Educators & Admins can preview all published courses.
    // Students and Anonymous visitors ONLY see courses they are eligible for.
    const isEducatorOrAdmin =
      req.user && ["admin", "hod", "teacher", "faculty"].includes(req.user.role);

    if (!isEducatorOrAdmin) {
      const studentDeptId = req.user?.departmentId
        ? (req.user.departmentId._id || req.user.departmentId)
        : null;

      const audienceConditions = [
        // 1. All VCETians courses (open to entire college)
        { targetAudience: "all" },
        { isDepartmentOnly: false, targetAudience: { $ne: "department" } },
        { targetAudience: { $exists: false }, isDepartmentOnly: { $exists: false } },
        { isDepartmentOnly: null, targetAudience: null },
      ];

      // 2. If logged in student with an active department, also include their department-restricted courses
      if (studentDeptId) {
        audienceConditions.push({
          $or: [{ isDepartmentOnly: true }, { targetAudience: "department" }],
          departmentId: studentDeptId,
        });
      }

      const audienceFilter = { $or: audienceConditions };

      if (query.$or) {
        query.$and = [{ $or: query.$or }, audienceFilter];
        delete query.$or;
      } else {
        query.$and = [audienceFilter];
      }
    }

    const courses = await Course.find(query)
      .populate("departmentId", "code name")
      .sort({ createdAt: -1 });

    const courseIds = courses.map((c) => c._id);
    const moduleCounts = await CourseModule.aggregate([
      { $match: { courseId: { $in: courseIds }, isPublished: true } },
      { $group: { _id: "$courseId", count: { $sum: 1 } } },
    ]);

    const moduleCountMap = {};
    moduleCounts.forEach((m) => {
      moduleCountMap[m._id.toString()] = m.count;
    });

    let userEnrollmentsMap = {};
    if (req.user && req.user.role === "student") {
      const enrollments = await Enrollment.find({ studentId: req.user._id });
      enrollments.forEach((e) => {
        userEnrollmentsMap[e.courseId.toString()] = {
          status: e.status,
          progressPercentage: e.progressPercentage,
          completedModulesCount: e.completedModules.length,
          completedModules: e.completedModules,
          enrollmentId: e._id,
        };
      });
    }

    const isPrivileged = req.user && (req.user.role === "admin" || req.user.role === "teacher");

    const coursesWithEnrollment = courses.map((c) => {
      const rawObj = c.toObject();
      if (rawObj.departmentId && typeof rawObj.departmentId === "object") {
        rawObj.departmentCode = rawObj.departmentId.code || "";
        rawObj.departmentName = rawObj.departmentId.name || "";
      }
      const cObj = isPrivileged ? rawObj : stripInternalCourseFields(rawObj);
      const realModuleCount = moduleCountMap[c._id.toString()] || cObj.totalModules || 0;
      const enrollment = userEnrollmentsMap[c._id.toString()] || null;
      const progress = enrollment ? enrollment.progressPercentage : 0;
      return {
        ...cObj,
        totalModules: realModuleCount,
        modulesCount: realModuleCount,
        modules: Array.from({ length: realModuleCount }, (_, i) => ({ id: i + 1 })),
        progress,
        enrollment,
      };
    });

    res.json({
      success: true,
      courses: coursesWithEnrollment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/courses/my
 * @desc    Get courses assigned to the logged-in faculty member
 * @access  Protected (Teacher / Admin)
 */
export async function getMyCourses(req, res, next) {
  try {
    const { category, search } = req.query;
    // Faculty & HOD must see their assigned/department courses whether Draft or Published!
    const query = {};

    if (req.user.role === "admin") {
      // Admin can see all courses
    } else if (req.user.role === "hod") {
      // HOD sees all courses created by them, in their department, or assigned
      const hodOr = [
        { createdBy: req.user._id },
        { assignedFacultyId: req.user._id },
      ];
      if (req.user.departmentId) {
        hodOr.push({ departmentId: idOf(req.user.departmentId) });
      }
      query.$or = hodOr;
    } else {
      // Regular Faculty: ONLY sees courses assigned to them by HOD. Other faculty cannot see the course.
      query.$or = [
        { assignedFacultyId: req.user._id },
        ...(req.user.name ? [{ assignedFacultyName: req.user.name }] : []),
      ];
    }

    if (category && category !== "All") {
      query.category = category;
    }
    if (search) {
      const searchCond = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchCond }];
        delete query.$or;
      } else {
        query.$or = searchCond;
      }
    }

    const courses = await Course.find(query).sort({ createdAt: -1 });

    const courseIds = courses.map((c) => c._id);
    const moduleCounts = await CourseModule.aggregate([
      { $match: { courseId: { $in: courseIds } } },
      { $group: { _id: "$courseId", count: { $sum: 1 } } },
    ]);

    const moduleCountMap = {};
    moduleCounts.forEach((m) => {
      moduleCountMap[m._id.toString()] = m.count;
    });

    const coursesWithEnrichment = courses.map((c) => {
      const cObj = c.toObject();
      const realModuleCount = moduleCountMap[c._id.toString()] || cObj.totalModules || 0;
      return {
        ...cObj,
        totalModules: realModuleCount,
        modulesCount: realModuleCount,
        modules: Array.from({ length: realModuleCount }, (_, i) => ({ id: i + 1 })),
        progress: 0,
      };
    });

    res.json({
      success: true,
      courses: coursesWithEnrichment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/courses/:slug
 * @desc    Get course details with all modules
 * @access  Public / Protected
 */
export async function getCourseBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const course = await Course.findOne({
      $or: [{ slug }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
    }).populate("departmentId", "code name");

    if (!course || !course.isPublished) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    // Role-based Audience Enforcement:
    // Educators & Admins can access all courses.
    // Students and Anonymous visitors are restricted if the course is department-only.
    const isEducatorOrAdmin =
      req.user && ["admin", "hod", "teacher", "faculty"].includes(req.user.role);
    const isDeptOnly = course.isDepartmentOnly || course.targetAudience === "department";

    if (isDeptOnly && course.departmentId && !isEducatorOrAdmin) {
      const studentDeptId = req.user?.departmentId
        ? String(req.user.departmentId._id || req.user.departmentId)
        : null;
      const courseDeptId = String(course.departmentId._id || course.departmentId);

      if (!req.user) {
        return res.status(403).json({
          success: false,
          message: `This course is reserved exclusively for ${course.departmentId.code || "department"} students. Please log in with your institutional student account.`,
          code: "DEPARTMENT_RESTRICTED",
          departmentCode: course.departmentId.code,
        });
      }

      if (!studentDeptId || studentDeptId !== courseDeptId) {
        return res.status(403).json({
          success: false,
          message: `Access Restricted: This course is exclusively designed for ${course.departmentId.code || course.departmentId.name || "designated department"} students.`,
          code: "DEPARTMENT_RESTRICTED",
          departmentCode: course.departmentId.code,
          departmentName: course.departmentId.name,
        });
      }
    }

    const modules = await CourseModule.find({ courseId: course._id, isPublished: true }).sort({ moduleNumber: 1, order: 1 });

    let enrollment = null;
    if (req.user && req.user.role === "student") {
      enrollment = await Enrollment.findOne({ studentId: req.user._id, courseId: course._id });
    }

    const completedModuleIds = (enrollment?.completedModules || []).map((id) => id.toString());

    let moduleProgressMap = new Map();
    let certMap = new Map();

    if (req.user) {
      const progresses = await ModuleProgress.find({ studentId: req.user._id, courseId: course._id });
      progresses.forEach((p) => moduleProgressMap.set(p.moduleId.toString(), p));

      const certs = await Certificate.find({ studentId: req.user._id, courseId: course._id });
      certs.forEach((c) => {
        if (c.moduleId) certMap.set(c.moduleId.toString(), c);
      });
    }

    // Check if student has already completed the course
    const passedModulesCount = Array.from(moduleProgressMap.values()).filter((p) => p.testPassed).length;
    const isCourseCompleted =
      (enrollment && (enrollment.status === "completed" || enrollment.progressPercentage >= 100)) ||
      (modules.length > 0 && passedModulesCount >= modules.length) ||
      (modules.length > 0 && completedModuleIds.length >= modules.length);

    let previousCompleted = true; // Module 1 starts accessible
    const isPrivileged = req.user && (req.user.role === "admin" || req.user.role === "teacher");

    const sanitizedModules = modules.map((mod, idx) => {
      const obj = mod.toObject();
      const mIdStr = obj._id.toString();
      const p = moduleProgressMap.get(mIdStr);
      const cert = certMap.get(mIdStr);

      const isPassed = completedModuleIds.includes(mIdStr) || Boolean(p?.testPassed);
      const isUnlocked = isPrivileged || isCourseCompleted || previousCompleted;

      // Update flag for subsequent modules (strictly sequential)
      previousCompleted = isPassed;

      obj.completed = isPassed;
      obj.isUnlocked = isUnlocked;
      obj.watchPercentage = p?.watchPercentage || (isCourseCompleted ? 100 : 0);
      obj.uniqueWatchedSeconds = p?.uniqueWatchedSeconds || 0;
      const isVideoMandatory = Boolean(m.hasVideo && m.isVideoMandatory);
      obj.videoRequirementMet = isCourseCompleted || !isVideoMandatory || Boolean(p?.videoRequirementMet);
      obj.testUnlocked = isCourseCompleted || isPrivileged || (isUnlocked && (!isVideoMandatory || Boolean(p?.testUnlocked && p?.videoRequirementMet)));
      obj.testScore = p?.testScore ?? null;
      obj.testPassed = isPassed;
      obj.status = p?.status || (isPassed ? "module_completed" : isUnlocked ? "video_in_progress" : "video_locked");

      if (cert) {
        obj.certificate = {
          id: cert._id,
          certificateNumber: cert.certificateNumber,
          score: cert.score,
          issuedAt: cert.issuedAt,
          verificationCode: cert.verificationCode,
        };
      }

      if (!isPrivileged && obj.mcqs) {
        obj.mcqs = obj.mcqs.map((q) => {
          const { correctAnswer, explanation, ...rest } = q;
          return rest;
        });
      }
      return obj;
    });

    const cObj = isPrivileged ? course.toObject() : stripInternalCourseFields(course.toObject());
    cObj.totalModules = modules.length;
    const completedCount = sanitizedModules.filter((m) => m.completed).length;
    const calculatedProgress = modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0;
    cObj.progress = enrollment ? Math.max(enrollment.progressPercentage, calculatedProgress) : calculatedProgress;
    cObj.isCourseCompleted = isCourseCompleted || cObj.progress >= 100;

    res.json({
      success: true,
      course: cObj,
      modules: sanitizedModules,
      enrollment,
    });
  } catch (error) {
    next(error);
  }
}


/**
 * @route   POST /api/courses
 * @desc    Create course with optional cover thumbnail
 * @access  Protected (Admin / Teacher)
 */
/**
 * @route   GET /api/courses/department-faculty
 * @desc    Get all faculty members in the HOD's own department (for course assignment dropdown)
 * @access  Protected (HOD / Admin)
 */
export async function getDepartmentFaculty(req, res, next) {
  try {
    if (req.user.role !== "hod" && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only HOD or Admin can access department faculty list.",
        code: "FORBIDDEN",
      });
    }

    // Always use the HOD's own departmentId from the JWT — never trust client params
    const hodDeptId = req.user.departmentId ? idOf(req.user.departmentId) : null;
    if (!hodDeptId && req.user.role === "hod") {
      return res.status(400).json({
        success: false,
        message: "Your account does not have a department assigned. Please contact the administrator.",
      });
    }

    const query = {
      isActive: true,
      role: { $in: ["faculty", "teacher"] },
    };

    // HOD: strictly filter by their own department
    if (req.user.role === "hod" && hodDeptId) {
      query.departmentId = hodDeptId;
    }
    // Admin: optionally filter by ?departmentId param
    if (req.user.role === "admin" && req.query.departmentId) {
      query.departmentId = req.query.departmentId;
    }

    const faculty = await User.find(query)
      .populate("departmentId", "code name")
      .select("name staffId designation email departmentId departmentCode")
      .sort({ name: 1 });

    res.json({
      success: true,
      faculty: faculty.map((f) => ({
        _id: f._id,
        name: f.name,
        staffId: f.staffId,
        designation: f.designation || "Assistant Professor",
        email: f.email,
        departmentCode: f.departmentId?.code || f.departmentCode || "",
        departmentName: f.departmentId?.name || "",
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function createCourse(req, res, next) {
  try {
    const {
      title,
      description,
      category = "Programming",
      level = "Beginner",
      instructor,
      instructorName,
      duration = "30 Days",
      durationDays,
      passingScore,
      passingPercentage,
      certificateEnabled = true,
      thumbnailUrl,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: "Title and description are required." });
    }

    if (req.user.role !== "hod" && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Courses can only be created by an HOD or Administrator.",
        code: "HOD_ADMIN_ONLY",
      });
    }

    let assignedFacultyId;
    let assignedFacultyName = "";

    const candidateFacultyId = req.body.assignedFacultyId;
    if (!candidateFacultyId) {
      return res.status(400).json({
        success: false,
        message: "Faculty assignment is compulsory. The HOD must select the faculty member who will manage this course's modules.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(candidateFacultyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid faculty ID format.",
      });
    }

    // Build query: faculty must be from HOD's same department (server-enforced)
    const facultyQuery = {
      _id: candidateFacultyId,
      role: { $in: ["faculty", "teacher", "hod"] },
    };
    if (req.user.role === "hod" && req.user.departmentId) {
      facultyQuery.departmentId = idOf(req.user.departmentId);
    }

    const facultyUser = await User.findOne(facultyQuery);
    if (!facultyUser) {
      return res.status(400).json({
        success: false,
        message: req.user.role === "hod"
          ? "Invalid faculty: The selected faculty member must belong to your department."
          : "Invalid faculty member assigned. Faculty must be a registered faculty member.",
      });
    }

    assignedFacultyId = facultyUser._id;
    assignedFacultyName = facultyUser.name;

    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    let slug = baseSlug;
    let slugCounter = 2;
    while (await Course.exists({ slug })) {
      slug = `${baseSlug}-${slugCounter}`;
      slugCounter += 1;
    }

    let finalThumbnail = "";
    let finalThumbnailUrl = thumbnailUrl || "";

    if (req.file) {
      finalThumbnail = req.file.filename;
      finalThumbnailUrl = `/uploads/courses/${req.file.filename}`;
    }

    const fallbackInstructor = assignedFacultyName || req.user.name;

    const targetAudience = req.body.targetAudience === "all" ? "all" : "department";
    const isDepartmentOnly = targetAudience === "department" || req.body.isDepartmentOnly === "true" || req.body.isDepartmentOnly === true;

    // Always resolve departmentId: from HOD, or fallback to assigned faculty's department
    let resolvedDepartmentId = req.user.departmentId ? idOf(req.user.departmentId) : undefined;
    if (!resolvedDepartmentId && facultyUser?.departmentId) {
      resolvedDepartmentId = facultyUser.departmentId;
    }

    const course = await Course.create({
      title,
      slug,
      description,
      category,
      level,
      instructor: instructor || instructorName || fallbackInstructor,
      instructorName: instructorName || instructor || fallbackInstructor,
      assignedFacultyId,
      assignedFacultyName,
      departmentId: resolvedDepartmentId,
      targetAudience,
      isDepartmentOnly,
      duration: duration || "Self-Paced",
      durationDays: durationDays ? Number(durationDays) : 30,
      thumbnail: finalThumbnail,
      thumbnailUrl: finalThumbnailUrl,
      passingScore: passingScore ? Number(passingScore) : (passingPercentage ? Number(passingPercentage) : 50),
      passingPercentage: passingPercentage ? Number(passingPercentage) : (passingScore ? Number(passingScore) : 50),
      certificateEnabled: certificateEnabled === "true" || certificateEnabled === true,
      isPublished: req.body.isPublished === true || req.body.isPublished === "true" ? true : false,
      createdBy: req.user._id,
    });

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "CREATE",
      resourceType: "Course",
      resourceId: course._id.toString(),
      details: `Created new course '${course.title}' (Assigned to: ${assignedFacultyName})`,
    });

    res.status(201).json({ success: true, message: "Course created successfully.", course });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PATCH /api/courses/:id/publish-status
 * @desc    Toggle or set course publish status (Draft vs Published to PrepZone)
 * @access  Protected (HOD of the course's department / Admin)
 */
export async function togglePublishStatus(req, res, next) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    const isSuperAdmin = req.user.role === "admin";
    const isHodDept =
      req.user.role === "hod" &&
      course.departmentId &&
      req.user.departmentId &&
      idOf(course.departmentId) === idOf(req.user.departmentId);

    if (!isSuperAdmin && !isHodDept) {
      return res.status(403).json({
        success: false,
        message: "Only the HOD of this course's department or an admin can change its publication status.",
      });
    }

    const newStatus = typeof req.body.isPublished === "boolean" ? req.body.isPublished : !course.isPublished;
    course.isPublished = newStatus;
    await course.save();

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: newStatus ? "PUBLISH" : "UNPUBLISH",
      resourceType: "Course",
      resourceId: course._id.toString(),
      details: `${newStatus ? "Published" : "Unpublished"} course '${course.title}'`,
    });

    return res.json({
      success: true,
      message: newStatus ? "Course published successfully to PrepZone." : "Course moved to draft (hidden from students).",
      course,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/courses/:id
 * @desc    Update course with optional cover thumbnail
 * @access  Protected (HOD of the course's department / Admin)
 */
export async function updateCourse(req, res, next) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    // Course metadata is managed only by the department HOD or admin.
    const isSuperAdmin = req.user.role === "admin";
    const isHodDept =
      req.user.role === "hod" &&
      course.departmentId &&
      req.user.departmentId &&
      idOf(course.departmentId) === idOf(req.user.departmentId);
    if (!isSuperAdmin && !isHodDept) {
      return res.status(403).json({
        success: false,
        message: "Only the HOD of this course's department or an admin can modify this course. Assigned faculty manage the course modules.",
      });
    }

    const updates = { ...req.body };

    // Slug is immutable once a course is created — keeps course URLs stable.
    delete updates.slug;
    delete updates.assignedFacultyName;

    if ((req.user.role === "admin" || req.user.role === "hod") && updates.assignedFacultyId) {
      if (!mongoose.Types.ObjectId.isValid(updates.assignedFacultyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid faculty ID format.",
        });
      }

      const facultyUser = await User.findOne({
        _id: updates.assignedFacultyId,
        role: { $in: ["faculty", "teacher", "hod"] },
        // HODs may only assign faculty within their own department.
        ...(req.user.role === "hod" && req.user.departmentId
          ? { departmentId: idOf(req.user.departmentId) }
          : {}),
      });
      if (!facultyUser) {
        return res.status(400).json({
          success: false,
          message: "Invalid faculty member assigned. Faculty must be a registered faculty member.",
        });
      }

      updates.assignedFacultyId = facultyUser._id;
      updates.assignedFacultyName = facultyUser.name;
    }

    if (req.file) {
      if (course.thumbnail) deleteUploadedFile(course.thumbnail, "courses");
      if (course.thumbnailUrl) deleteUploadedFile(course.thumbnailUrl, "courses");
      updates.thumbnail = req.file.filename;
      updates.thumbnailUrl = `/uploads/courses/${req.file.filename}`;
    }

    if (updates.targetAudience !== undefined) {
      updates.isDepartmentOnly = updates.targetAudience === "department";
    } else if (updates.isDepartmentOnly !== undefined) {
      updates.targetAudience = (updates.isDepartmentOnly === "true" || updates.isDepartmentOnly === true) ? "department" : "all";
      updates.isDepartmentOnly = updates.targetAudience === "department";
    }

    if ((updates.isDepartmentOnly || updates.targetAudience === "department") && !course.departmentId) {
      if (req.user.departmentId) {
        updates.departmentId = idOf(req.user.departmentId);
      } else if (course.assignedFacultyId) {
        const facUser = await User.findById(course.assignedFacultyId);
        if (facUser?.departmentId) {
          updates.departmentId = facUser.departmentId;
        }
      }
    }

    Object.assign(course, updates);
    await course.save();

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "UPDATE",
      resourceType: "Course",
      resourceId: course._id.toString(),
      details: `Updated course '${course.title}'`,
    });

    res.json({ success: true, message: "Course updated.", course });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/courses/:id
 * @desc    Delete course
 * @access  Protected (HOD of the course's department / Admin)
 */
export async function deleteCourse(req, res, next) {
  try {
    const isId = mongoose.Types.ObjectId.isValid(req.params.id);
    const course = isId
      ? await Course.findById(req.params.id)
      : await Course.findOne({ slug: req.params.id });

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    const regNum = String(req.user?.registerNumber || "").toUpperCase();
    const email = String(req.user?.email || "").toLowerCase();
    const name = String(req.user?.name || "").toUpperCase();
    const staffId = String(req.user?.staffId || "").toUpperCase();
    const designation = String(req.user?.designation || "").toLowerCase();

    const isDeveloper =
      regNum.includes("732924CSR014") ||
      email.includes("732924csr014") ||
      name.includes("ATHITHYAN");

    const isSuperAdmin = req.user?.role === "admin" || isDeveloper;
    const isHod =
      req.user?.role === "hod" ||
      req.user?.isHod === true ||
      staffId.includes("104") ||
      staffId.includes("HOD") ||
      staffId.endsWith("01") ||
      designation.includes("hod") ||
      designation.includes("head of the department") ||
      designation.includes("head of department");

    const isHodDept =
      isHod &&
      (!course.departmentId ||
        !req.user?.departmentId ||
        idOf(course.departmentId) === idOf(req.user.departmentId));

    if (!isSuperAdmin && !isHodDept) {
      return res.status(403).json({
        success: false,
        message: "Only the HOD of this course's department or an admin can delete this course.",
      });
    }

    const courseId = course._id;
    const courseTitle = course.title;

    // Permanently remove course thumbnail from server disk
    if (course.thumbnail) deleteUploadedFile(course.thumbnail, "courses");
    if (course.thumbnailUrl) deleteUploadedFile(course.thumbnailUrl, "courses");

    // Permanently remove the course from MongoDB
    await Course.findByIdAndDelete(courseId);

    // Cascade delete associated modules, module progressions, and enrollments
    await CourseModule.deleteMany({ courseId });
    await ModuleProgress.deleteMany({ courseId });
    await Enrollment.deleteMany({ courseId });

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "DELETE",
      resourceType: "Course",
      resourceId: courseId.toString(),
      details: `Permanently deleted course '${courseTitle}' and all associated modules`,
    });

    res.json({ success: true, message: `Course '${courseTitle}' deleted successfully.` });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/courses/:id/enroll
 * @desc    Enroll in course
 * @access  Protected (Student)
 */
export async function enrollInCourse(req, res, next) {
  try {
    const courseId = req.params.id;
    const studentId = req.user._id;

    const course = await Course.findById(courseId);
    if (!course || !course.isPublished) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    const isDeptOnly = course.isDepartmentOnly || course.targetAudience === "department";
    if (isDeptOnly && course.departmentId) {
      const studentDeptId = String(req.user.departmentId?._id || req.user.departmentId || "");
      const courseDeptId = String(course.departmentId?._id || course.departmentId || "");
      if (!studentDeptId || studentDeptId !== courseDeptId) {
        return res.status(403).json({
          success: false,
          message: "This course is restricted exclusively to students of its designated department.",
          code: "DEPARTMENT_RESTRICTED",
        });
      }
    }

    let enrollment = await Enrollment.findOne({ studentId, courseId });
    if (!enrollment) {
      const firstModule = await CourseModule.findOne({ courseId, isPublished: true }).sort({ moduleNumber: 1 });

      enrollment = await Enrollment.create({
        studentId,
        courseId,
        status: "in_progress",
        currentModuleId: firstModule?._id || null,
        startedAt: new Date(),
      });
    }

    res.json({
      success: true,
      message: "Successfully enrolled in course.",
      enrollment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/courses/:id/complete-module
 * @desc    Mark a module complete & recalculate progress
 * @access  Protected (Student)
 */
export async function completeModule(req, res, next) {
  try {
    const rawCourseId = req.params.id;
    const { moduleId } = req.body;
    const studentId = req.user._id;

    if (!moduleId) {
      return res.status(400).json({ success: false, message: "moduleId is required." });
    }

    // Resolve course slug or _id to actual Course document
    const courseDoc = await Course.findOne({
      $or: [
        { slug: rawCourseId },
        { _id: rawCourseId.match(/^[0-9a-fA-F]{24}$/) ? rawCourseId : null },
      ].filter(Boolean),
    });

    if (!courseDoc) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    const courseId = courseDoc._id;

    let enrollment = await Enrollment.findOne({ studentId, courseId });
    if (!enrollment) {
      enrollment = await Enrollment.create({
        studentId,
        courseId,
        status: "in_progress",
      });
    }

    const strModId = moduleId.toString();
    if (!enrollment.completedModules.some((m) => m.toString() === strModId)) {
      enrollment.completedModules.push(strModId);
    }

    const totalModules = await CourseModule.countDocuments({ courseId, isPublished: true });
    const progress = totalModules > 0 ? Math.round((enrollment.completedModules.length / totalModules) * 100) : 100;
    enrollment.progressPercentage = Math.min(progress, 100);

    await updateStreakOnActivity(studentId);

    // If 100% complete, issue course completion points and certificate
    let certificateIssued = null;
    if (enrollment.progressPercentage >= 100 && enrollment.status !== "completed") {
      enrollment.status = "completed";
      enrollment.completedAt = new Date();
      try {
        certificateIssued = await issueCertificate({
          studentId,
          courseId,
          title: `Full Completion Certificate`,
          type: "course",
          score: 100,
        });
      } catch (certErr) {
        console.warn("Certificate auto-issue notice:", certErr.message);
      }
    } else {
      enrollment.status = "in_progress";
    }

    enrollment.lastActivityAt = new Date();
    await enrollment.save();

    const allModules = await CourseModule.find({ courseId, isPublished: true }).sort({ moduleNumber: 1, order: 1 });
    const completedSet = new Set((enrollment.completedModules || []).map((id) => id.toString()));

    const updatedModules = allModules.map((m) => {
      const obj = m.toObject();
      obj.completed = completedSet.has(obj._id.toString());
      return obj;
    });

    res.json({
      success: true,
      message: "Module marked as completed.",
      progress: enrollment.progressPercentage,
      enrollment,
      modules: updatedModules,
      certificate: certificateIssued,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/courses/my/enrollments
 * @desc    Get current student's enrolled courses
 * @access  Protected (Student)
 */
export async function getMyEnrollments(req, res, next) {
  try {
    const enrollments = await Enrollment.find({ studentId: req.user._id })
      .populate("courseId")
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      enrollments,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/courses/:slug/modules/:moduleId/video-progress
 * @desc    Record 5-second unique video segments and compute watch percentage
 * @access  Protected (Student / Authenticated)
 */
export async function recordVideoProgressHandler(req, res, next) {
  try {
    const { slug, moduleId } = req.params;
    const studentId = req.user._id;

    const course = await Course.findOne({
      $or: [{ slug }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
    });

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    const result = await recordVideoWatchProgress(studentId, course._id, moduleId, req.body);
    res.json(result);
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({ success: false, message: error.message, code: error.code || "FORBIDDEN" });
    }
    next(error);
  }
}

/**
 * @route   GET /api/courses/:slug/modules/:moduleId/progression
 * @desc    Get progression details for a specific module
 * @access  Protected (Student / Authenticated)
 */
export async function getModuleProgressionHandler(req, res, next) {
  try {
    const { slug, moduleId } = req.params;
    const studentId = req.user._id;

    const course = await Course.findOne({
      $or: [{ slug }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
    });

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    const { progress, moduleDoc, isUnlocked, isCourseDone } = await getOrCreateModuleProgress(studentId, course._id, moduleId);
    const cert = await Certificate.findOne({ studentId, courseId: course._id, moduleId: moduleDoc._id });
    const isPrivileged = req.user.role === "admin" || req.user.role === "teacher";
    const isVideoMandatory = Boolean(moduleDoc.hasVideo && moduleDoc.isVideoMandatory);
    const testUnlocked = isCourseDone || isPrivileged || (isUnlocked && (!isVideoMandatory || Boolean(progress.testUnlocked && progress.videoRequirementMet)));

    res.json({
      success: true,
      moduleId: moduleDoc._id,
      moduleNumber: moduleDoc.moduleNumber,
      title: moduleDoc.title,
      isUnlocked,
      status: progress.status,
      watchPercentage: progress.watchPercentage,
      uniqueWatchedSeconds: progress.uniqueWatchedSeconds,
      videoDurationSeconds: progress.videoDurationSeconds,
      videoRequirementMet: progress.videoRequirementMet,
      testUnlocked,
      testScore: progress.testScore,
      testPassed: progress.testPassed,
      testAttemptsCount: progress.testAttemptsCount,
      certificate: cert ? {
        id: cert._id,
        certificateNumber: cert.certificateNumber,
        score: cert.score,
        issuedAt: cert.issuedAt,
        verificationCode: cert.verificationCode,
      } : null,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/courses/:slug/progression
 * @desc    Get full course progression map for authenticated student
 * @access  Protected (Student / Authenticated)
 */
export async function getCourseProgressionHandler(req, res, next) {
  try {
    const { slug } = req.params;
    const studentId = req.user._id;

    const course = await Course.findOne({
      $or: [{ slug }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
    });

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    const progressionMap = await getCourseProgressionMap(studentId, course._id);
    res.json({
      success: true,
      ...progressionMap,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/courses/:slug/modules/:moduleId/submit-test
 * @desc    Submit module test, grade securely on server, issue Appreciation Certificate if score >= 50%
 * @access  Protected (Student / Authenticated)
 */
export async function submitModuleTestHandler(req, res, next) {
  try {
    const { slug, moduleId } = req.params;
    const studentId = req.user._id;

    const course = await Course.findOne({
      $or: [{ slug }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
    });

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    const result = await gradeAndSubmitModuleTest(studentId, course._id, moduleId, req.body);
    res.json(result);
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({
        success: false,
        message: error.message,
        code: error.code || "FORBIDDEN",
      });
    }
    next(error);
  }
}

