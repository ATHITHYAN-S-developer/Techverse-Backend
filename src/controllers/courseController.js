import { Course } from "../models/Course.js";
import { CourseModule } from "../models/CourseModule.js";
import { Enrollment } from "../models/Enrollment.js";
import { awardPoints } from "../services/pointsService.js";
import { updateStreakOnActivity } from "../services/streakService.js";
import { issueCertificate } from "../services/certificateService.js";
import { logAuditEvent } from "../services/auditService.js";

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

    // If user is authenticated, attach enrollment status
    let userEnrollmentsMap = {};
    if (req.user && req.user.role === "student") {
      const enrollments = await Enrollment.find({ studentId: req.user._id });
      enrollments.forEach((e) => {
        userEnrollmentsMap[e.courseId.toString()] = {
          status: e.status,
          progressPercentage: e.progressPercentage,
          completedModulesCount: e.completedModules.length,
          enrollmentId: e._id,
        };
      });
    }

    const coursesWithEnrollment = courses.map((c) => ({
      ...c.toObject(),
      enrollment: userEnrollmentsMap[c._id.toString()] || null,
    }));

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

    const isPrivileged = req.user && (req.user.role === "admin" || req.user.role === "teacher");
    const sanitizedModules = modules.map((mod) => {
      const obj = mod.toObject();
      if (!isPrivileged && obj.mcqs) {
        obj.mcqs = obj.mcqs.map((q) => {
          const { correctAnswer, explanation, ...rest } = q;
          return rest;
        });
      }
      return obj;
    });

    let enrollment = null;
    if (req.user && req.user.role === "student") {
      enrollment = await Enrollment.findOne({ studentId: req.user._id, courseId: course._id });
    }

    res.json({
      success: true,
      course,
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
      passingScore: passingScore ? Number(passingScore) : 75,
      passingPercentage: passingPercentage ? Number(passingPercentage) : 75,
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
    const courseId = req.params.id;
    const { moduleId } = req.body;
    const studentId = req.user._id;

    if (!moduleId) {
      return res.status(400).json({ success: false, message: "moduleId is required." });
    }

    let enrollment = await Enrollment.findOne({ studentId, courseId });
    if (!enrollment) {
      enrollment = await Enrollment.create({
        studentId,
        courseId,
        status: "in_progress",
      });
    }

    // Add module if not already completed
    if (!enrollment.completedModules.includes(moduleId)) {
      enrollment.completedModules.push(moduleId);
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

    res.json({
      success: true,
      message: "Module marked as completed.",
      enrollment,
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
