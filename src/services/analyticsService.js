import { User } from "../models/User.js";
import { Department } from "../models/Department.js";
import { Resource } from "../models/Resource.js";
import { Course } from "../models/Course.js";
import { Enrollment } from "../models/Enrollment.js";
import { Certificate } from "../models/Certificate.js";
import { Visitor } from "../models/Visitor.js";
import { TestAttempt } from "../models/TestAttempt.js";

export async function getOverviewSummary() {
  const [
    totalStudents,
    totalTeachers,
    totalDepartments,
    totalResources,
    totalCourses,
    certificatesIssued,
  ] = await Promise.all([
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "teacher" }),
    Department.countDocuments({ isActive: true }),
    Resource.countDocuments({ isPublished: true }),
    Course.countDocuments({ isPublished: true }),
    Certificate.countDocuments({ status: "valid" }),
  ]);

  return {
    totalStudents,
    totalTeachers,
    totalDepartments,
    totalResources,
    totalCourses,
    certificatesIssued,
  };
}

export async function getDepartmentAnalytics() {
  const departments = await Department.find({ isActive: true }).select("_id code name");

  const results = await Promise.all(
    departments.map(async (dept) => {
      const [students, resources] = await Promise.all([
        User.countDocuments({ role: "student", departmentId: dept._id }),
        Resource.countDocuments({ departmentId: dept._id }),
      ]);
      return {
        departmentId: dept._id,
        code: dept.code,
        name: dept.name,
        students,
        resources,
      };
    })
  );

  return results;
}

export async function getCourseAnalytics() {
  const courses = await Course.find({ isPublished: true }).select("_id title slug");

  const results = await Promise.all(
    courses.map(async (course) => {
      const [enrolled, completed, inProgress] = await Promise.all([
        Enrollment.countDocuments({ courseId: course._id }),
        Enrollment.countDocuments({ courseId: course._id, status: "completed" }),
        Enrollment.countDocuments({ courseId: course._id, status: "in_progress" }),
      ]);

      const rate = enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0;

      return {
        courseId: course._id,
        name: course.title,
        slug: course.slug,
        enrollments: enrolled,
        completions: completed,
        inProgress,
        rate,
      };
    })
  );

  return results;
}

export async function getVisitorAnalytics(days = 7) {
  const visitors = await Visitor.find().sort({ date: -1 }).limit(days);
  return visitors.reverse();
}

export async function recordVisitorHit(type = "visit") {
  const today = new Date().toISOString().split("T")[0];
  let visitor = await Visitor.findOne({ date: today });
  if (!visitor) {
    visitor = new Visitor({ date: today, totalVisits: 1 });
  } else {
    visitor.totalVisits += 1;
    if (type === "resource") visitor.resourceViews += 1;
    if (type === "course") visitor.courseViews += 1;
    if (type === "announcement") visitor.announcementViews += 1;
  }
  await visitor.save();

  const all = await Visitor.aggregate([
    { $group: { _id: null, total: { $sum: "$totalVisits" } } }
  ]);
  const total = all[0]?.total || visitor.totalVisits || 1;
  return { count: total, today: visitor.totalVisits, isLive: true };
}

export async function getVisitorTotals() {
  const today = new Date().toISOString().split("T")[0];
  const todayDoc = await Visitor.findOne({ date: today });
  const all = await Visitor.aggregate([
    { $group: { _id: null, total: { $sum: "$totalVisits" } } }
  ]);
  const total = all[0]?.total || todayDoc?.totalVisits || 0;
  return { count: total, today: todayDoc?.totalVisits || 0, isLive: true };
}
