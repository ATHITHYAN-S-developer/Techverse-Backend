import mongoose from "mongoose";
import xlsx from "xlsx";
import { Course } from "../models/Course.js";
import { CourseModule } from "../models/CourseModule.js";
import { Enrollment } from "../models/Enrollment.js";
import { ModuleProgress } from "../models/ModuleProgress.js";
import { User } from "../models/User.js";

/** Normalize an id reference (raw ObjectId, string, or populated object) to hex string. */
const idOf = (v) => String(v?._id || v || "");

const MODULE_STATUS_LABELS = {
  video_locked: "Locked",
  video_in_progress: "Video In Progress",
  video_completed: "Video Completed",
  test_unlocked: "Test Unlocked",
  test_in_progress: "Test In Progress",
  test_failed: "Test Failed",
  test_passed: "Test Passed",
  certificate_generated: "Certificate Generated",
  module_completed: "Completed",
};

const ENROLLMENT_STATUS_LABELS = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};

/**
 * Shared access check for the students list AND the Excel export so the two
 * can never drift apart.
 *   admin  -> everything
 *   hod    -> only courses of their own department
 *   faculty-> only courses assigned to them
 * Returns null when allowed, or { status, message } when denied.
 */
async function assertCourseStudentsAccess(req, course) {
  if (req.user.role === "admin") return null;

  if (req.user.role === "hod") {
    const sameDept =
      course.departmentId &&
      req.user.departmentId &&
      idOf(course.departmentId) === idOf(req.user.departmentId);
    const isCreatorOrAssigned =
      idOf(course.createdBy) === idOf(req.user._id) ||
      idOf(course.assignedFacultyId) === idOf(req.user._id);

    if (sameDept || isCreatorOrAssigned || !course.departmentId) return null;
    return {
      status: 403,
      message: "Only the HOD of this course's department can view its students.",
    };
  }

  const isAssigned =
    Boolean(course.assignedFacultyId) &&
    String(course.assignedFacultyId) === String(req.user._id);
  if (isAssigned) return null;

  return {
    status: 403,
    message: "You can only view students of courses assigned to you by the HOD or Admin.",
  };
}

/**
 * Shared report builder — the JSON list and the Excel export both consume
 * this, fetching EVERY enrolled student (never a paginated subset).
 */
async function buildCourseStudentsReport(course) {
  const modules = await CourseModule.find({ courseId: course._id }).sort({
    moduleNumber: 1,
    order: 1,
  });

  const enrollments = await Enrollment.find({ courseId: course._id }).sort({
    createdAt: 1,
  });
  const studentIds = enrollments.map((e) => e.studentId);

  const [users, progressDocs] = await Promise.all([
    User.find({ _id: { $in: studentIds } })
      .select("name email registerNumber departmentCode department year section")
      .lean(),
    ModuleProgress.find({ courseId: course._id, studentId: { $in: studentIds } }).lean(),
  ]);

  const userById = new Map(users.map((u) => [u._id.toString(), u]));
  const progressByKey = new Map(
    progressDocs.map((p) => [`${p.studentId.toString()}_${p.moduleId.toString()}`, p])
  );

  const students = enrollments.map((enr) => {
    const studentId = enr.studentId.toString();
    const user = userById.get(studentId) || {};
    const completed = new Set((enr.completedModules || []).map((m) => m.toString()));

    const moduleStatuses = modules.map((mod) => {
      const modId = mod._id.toString();
      if (completed.has(modId)) return "Completed";
      const progress = progressByKey.get(`${studentId}_${modId}`);
      if (progress?.status) return MODULE_STATUS_LABELS[progress.status] || progress.status;
      return "Not Started";
    });

    return {
      studentId,
      name: user.name || "",
      email: user.email || "",
      registerNumber: user.registerNumber || "",
      department: user.department || user.departmentCode || "",
      year: user.year || "",
      section: user.section || "",
      enrolledAt: enr.startedAt || enr.createdAt,
      enrollmentStatus: ENROLLMENT_STATUS_LABELS[enr.status] || enr.status || "",
      progressPercentage: Number(enr.progressPercentage || 0),
      moduleStatuses,
    };
  });

  return {
    course: {
      _id: course._id.toString(),
      title: course.title,
      slug: course.slug,
    },
    modules: modules.map((m) => ({
      _id: m._id.toString(),
      moduleNumber: m.moduleNumber,
      title: m.title,
    })),
    students,
  };
}

/** Load course by id or respond 404; shared by both handlers. */
async function loadCourseForReport(req, res) {
  const { courseId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    res.status(404).json({ success: false, message: "Course not found." });
    return null;
  }
  const course = await Course.findById(courseId);
  if (!course) {
    res.status(404).json({ success: false, message: "Course not found." });
    return null;
  }
  const denial = await assertCourseStudentsAccess(req, course);
  if (denial) {
    res.status(denial.status).json({
      success: false,
      message: denial.message,
      code: "COURSE_ACCESS_DENIED",
    });
    return null;
  }
  return course;
}

/**
 * @route   GET /api/courses/:courseId/students
 * @desc    Enrolled students of a course with per-module status
 * @access  Assigned faculty / Dept HOD / Admin
 */
export async function getCourseStudents(req, res, next) {
  try {
    const course = await loadCourseForReport(req, res);
    if (!course) return;

    const report = await buildCourseStudentsReport(course);
    res.json({
      success: true,
      course: report.course,
      modules: report.modules,
      students: report.students,
      totalStudents: report.students.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/courses/:courseId/students/export
 * @desc    Excel (.xlsx) export of the enrolled student list with per-module status
 * @access  Assigned faculty / Dept HOD / Admin
 */
export async function exportCourseStudentsExcel(req, res, next) {
  try {
    const course = await loadCourseForReport(req, res);
    if (!course) return;

    const report = await buildCourseStudentsReport(course);

    const header = [
      "Name",
      "Email",
      "Roll Number",
      "Enrollment Date",
      "Overall Progress",
      "Enrollment Status",
      ...report.modules.map((m, i) => `Module ${i + 1}: ${m.title}`),
    ];

    const rows = report.students.map((s) => [
      s.name,
      s.email,
      s.registerNumber,
      s.enrolledAt ? new Date(s.enrolledAt).toISOString().slice(0, 10) : "",
      `${s.progressPercentage}%`,
      s.enrollmentStatus,
      ...s.moduleStatuses,
    ]);

    const worksheet = xlsx.utils.aoa_to_sheet([header, ...rows]);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Students");
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    const safeSlug =
      String(course.slug || course.title || "course")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "course";

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeSlug}-students.xlsx"`
    );
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}
