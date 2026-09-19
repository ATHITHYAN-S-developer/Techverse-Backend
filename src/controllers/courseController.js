import { Course } from "../models/Course.js";
import { CourseModule } from "../models/CourseModule.js";
import { Enrollment } from "../models/Enrollment.js";
import { ModuleProgress } from "../models/ModuleProgress.js";
import { Certificate } from "../models/Certificate.js";
import { awardPoints } from "../services/pointsService.js";
import { updateStreakOnActivity } from "../services/streakService.js";
import { issueCertificate } from "../services/certificateService.js";
import { logAuditEvent } from "../services/auditService.js";
import {
  recordVideoWatchProgress,
  getCourseProgressionMap,
  submitModuleTest as gradeAndSubmitModuleTest,
  getOrCreateModuleProgress,
} from "../services/moduleProgressionService.js";


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

    const courses = await Course.find(query).sort({ createdAt: -1 });

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

    const coursesWithEnrollment = courses.map((c) => {
      const cObj = c.toObject();
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
 * @route   GET /api/courses/:slug
 * @desc    Get course details with all modules
 * @access  Public / Protected
 */
export async function getCourseBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const course = await Course.findOne({
      $or: [{ slug }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
    });

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
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
      obj.videoRequirementMet = isCourseCompleted || Boolean(p?.videoRequirementMet);
      obj.testUnlocked = isCourseCompleted || isPrivileged || (isUnlocked && Boolean(p?.testUnlocked && p?.videoRequirementMet));
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

    const cObj = course.toObject();
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

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    let finalThumbnail = "";
    let finalThumbnailUrl = thumbnailUrl || "";

    if (req.file) {
      finalThumbnail = req.file.filename;
      finalThumbnailUrl = `/uploads/courses/${req.file.filename}`;
    }

    const course = await Course.create({
      title,
      slug,
      description,
      category,
      level,
      instructor: instructor || instructorName || req.user.name,
      instructorName: instructorName || instructor || req.user.name,
      duration,
      durationDays: durationDays ? Number(durationDays) : 30,
      thumbnail: finalThumbnail,
      thumbnailUrl: finalThumbnailUrl,
      passingScore: passingScore ? Number(passingScore) : 50,
      passingPercentage: passingPercentage ? Number(passingPercentage) : 50,
      certificateEnabled: certificateEnabled === "true" || certificateEnabled === true,
      isPublished: true,
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
      details: `Created new course '${course.title}'`,
    });

    res.status(201).json({ success: true, message: "Course created successfully.", course });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/courses/:id
 * @desc    Update course with optional cover thumbnail
 * @access  Protected (Admin / Teacher)
 */
export async function updateCourse(req, res, next) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    // Teacher ownership check
    if (req.user.role === "teacher" && course.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only modify courses created by yourself.",
      });
    }

    const updates = { ...req.body };

    if (req.file) {
      updates.thumbnail = req.file.filename;
      updates.thumbnailUrl = `/uploads/courses/${req.file.filename}`;
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
 * @access  Protected (Admin / Teacher)
 */
export async function deleteCourse(req, res, next) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    // Teacher ownership check
    if (req.user.role === "teacher" && course.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete courses created by yourself.",
      });
    }

    course.isPublished = false;
    await course.save();

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "DELETE",
      resourceType: "Course",
      resourceId: course._id.toString(),
      details: `Unpublished/deleted course '${course.title}'`,
    });

    res.json({ success: true, message: "Course removed." });
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
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
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

    // Award module points (+25)
    await awardPoints(studentId, 25, "module_completion", `Completed module for course`);
    await updateStreakOnActivity(studentId);

    // If 100% complete, issue course completion points and certificate
    let certificateIssued = null;
    if (enrollment.progressPercentage >= 100 && enrollment.status !== "completed") {
      enrollment.status = "completed";
      enrollment.completedAt = new Date();
      await awardPoints(studentId, 500, "course_completion", `Completed course milestone`);

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
    const testUnlocked = isCourseDone || isPrivileged || (isUnlocked && Boolean(progress.testUnlocked && progress.videoRequirementMet));

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

