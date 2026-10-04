import { User } from "../models/User.js";
import { Department } from "../models/Department.js";
import { Subject } from "../models/Subject.js";
import { Resource } from "../models/Resource.js";
import { Course } from "../models/Course.js";
import { Enrollment } from "../models/Enrollment.js";
import { Certificate } from "../models/Certificate.js";
import { Visitor } from "../models/Visitor.js";
import { TestAttempt } from "../models/TestAttempt.js";
import { CourseAssessment } from "../models/CourseAssessment.js";
import { CodingTest } from "../models/CodingTest.js";
import { ModuleProgress } from "../models/ModuleProgress.js";
import { AuditLog } from "../models/AuditLog.js";
import { TestViolation } from "../models/TestViolation.js";

// A user counts as "live on portal" when they authenticated within this window.
export const LIVE_WINDOW_MINUTES = 15;

// Presentation order only. The branch list itself is database-driven, so a new
// intake or a newly-opened branch shows up without touching this file.
const DEPARTMENT_ORDER = ["CSE", "ECE", "EEE", "CIVIL", "AIML", "BME", "MDE", "IT", "MECH", "AI&DS"];

// Fallback palette for departments that predate the shared catalog and have no
// stored colour.
const DEPARTMENT_COLORS = {
  CSE: "#0284c7",
  "AI&DS": "#7c3aed",
  ECE: "#db2777",
  IT: "#0891b2",
  EEE: "#d97706",
  MECH: "#dc2626",
  CIVIL: "#059669",
  AIML: "#9333ea",
  BME: "#16a34a",
  MDE: "#ea580c",
};

const COURSE_VELOCITY_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-purple-600",
  "bg-sky-600",
];

/** YYYY-MM-DD for a Date, in the server's local calendar day. */
function toLocalDay(input) {
  const d = input instanceof Date ? input : new Date(input);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Mongo `$dateToString` timezone argument derived from the server offset, so
 * daily buckets line up with the local calendar day used elsewhere in the app.
 */
function localTimezone() {
  const offsetMinutes = -new Date().getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, "0");
  const minutes = String(abs % 60).padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

/** Last `days` local-day keys, oldest first. */
function recentDayKeys(days) {
  const keys = [];
  const now = new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    keys.push(toLocalDay(d));
  }
  return keys;
}

function weekdayLabel(dayKey) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { weekday: "short" });
}

/**
 * Group rows by local calendar day into a dense, zero-filled series.
 * Accepts either a Mongo aggregation or a plain projection.
 *
 * Several aggregations can land on the same day (logins *and* downloads *and*
 * course activity), so rows are merged per day rather than overwriting one
 * another - otherwise whichever series is concatenated last would silently
 * discard the others.
 */
function denseDailySeries(rows, days, fields) {
  const keys = recentDayKeys(days);
  const byDay = new Map();

  for (const row of rows) {
    if (!row || !row._id) continue;
    const existing = byDay.get(row._id) || {};
    for (const field of fields) {
      existing[field] = (existing[field] || 0) + (row[field] || 0);
    }
    byDay.set(row._id, existing);
  }

  return keys.map((key, index) => {
    const row = byDay.get(key) || {};
    const point = {
      date: weekdayLabel(key),
      isoDate: key,
      index,
    };
    for (const field of fields) {
      point[field] = row[field] || 0;
    }
    return point;
  });
}

/** Zero-filled series grouped from documents that carry a YYYY-MM-DD string field. */
function denseDocumentSeries(docs, days, fields) {
  const keys = recentDayKeys(days);
  const byDay = new Map(docs.map((doc) => [doc.date, doc]));

  return keys.map((key, index) => {
    const doc = byDay.get(key) || {};
    const point = { date: weekdayLabel(key), isoDate: key, index };
    for (const field of fields) {
      point[field] = doc[field] || 0;
    }
    return point;
  });
}

/** Count of individual coding problems (the Coding Arena compiler pool). */
async function countCodingProblems() {
  const rows = await CodingTest.aggregate([
    { $unwind: "$problems" },
    { $count: "total" },
  ]);
  return rows[0]?.total || 0;
}

/**
 * KPI tiles for the executive control center. Every value is a live count so
 * the dashboard reflects the database rather than placeholder figures.
 */
export async function getKpiSummary() {
  const liveWindowStart = new Date(Date.now() - LIVE_WINDOW_MINUTES * 60 * 1000);

  const [
    totalStudents,
    activeStudents,
    blockedStudents,
    totalTeachers,
    activeTeachers,
    totalDepartments,
    totalCourses,
    publishedCourses,
    draftCourses,
    totalResources,
    resourcesByType,
    totalCodingTests,
    totalCodingProblems,
    certificatesIssued,
    revokedCertificates,
    liveUsers,
    liveStudents,
    todayVisitors,
    yesterdayVisitors,
  ] = await Promise.all([
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "student", isActive: true }),
    User.countDocuments({ role: "student", isActive: false }),
    User.countDocuments({ role: { $in: ["teacher", "faculty", "hod"] } }),
    User.countDocuments({ role: { $in: ["teacher", "faculty", "hod"] }, isActive: true }),
    Department.countDocuments({ isActive: true }),
    Course.countDocuments({}),
    Course.countDocuments({ isPublished: true }),
    Course.countDocuments({ isPublished: false }),
    Resource.countDocuments({}),
    Resource.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    CodingTest.countDocuments({}),
    countCodingProblems(),
    Certificate.countDocuments({ status: "valid" }),
    Certificate.countDocuments({ status: "revoked" }),
    User.countDocuments({ lastLoginAt: { $gte: liveWindowStart }, isActive: true }),
    User.countDocuments({
      role: "student",
      isActive: true,
      lastLoginAt: { $gte: liveWindowStart },
    }),
    // Today's visitors come from the daily bucket the counter now maintains,
    // not the all-time counter.
    Visitor.findOne({ date: toLocalDay(new Date()) }).select("totalVisits"),
    Visitor.findOne({ date: toLocalDay(new Date(Date.now() - 86400000)) }).select("totalVisits"),
  ]);

  const visitorsToday = todayVisitors?.totalVisits || 0;
  const visitorsYesterday = yesterdayVisitors?.totalVisits || 0;
  const visitorGrowth = visitorsYesterday > 0
    ? Number((((visitorsToday - visitorsYesterday) / visitorsYesterday) * 100).toFixed(1))
    : visitorsToday > 0
      ? 100
      : 0;

  const courseCompletionCount = await Enrollment.countDocuments({ status: "completed" });

  return {
    students: {
      total: totalStudents,
      active: activeStudents,
      blocked: blockedStudents,
    },
    teachers: {
      total: totalTeachers,
      active: activeTeachers,
      departments: totalDepartments,
    },
    courses: {
      total: totalCourses,
      published: publishedCourses,
      drafts: draftCourses,
      completedEnrollments: courseCompletionCount,
    },
    resources: {
      total: totalResources,
      byType: resourcesByType.reduce((acc, row) => {
        acc[row._id] = row.count;
        return acc;
      }, {}),
    },
    coding: {
      tests: totalCodingTests,
      problems: totalCodingProblems,
    },
    certificates: {
      issued: certificatesIssued,
      revoked: revokedCertificates,
    },
    visitors: {
      today: visitorsToday,
      yesterday: visitorsYesterday,
      growthPercent: visitorGrowth,
    },
    activeUsers: {
      count: liveUsers,
      students: liveStudents,
      windowMinutes: LIVE_WINDOW_MINUTES,
    },
  };
}

/**
 * Seven-day activity telemetry: logins, course progression, course-assessment attempts and
 * resource downloads. Returns exactly `days` points, zero-filled.
 */
export async function getActivityTelemetry(days = 7) {
  const keys = recentDayKeys(days);
  const firstDay = new Date(`${keys[0]}T00:00:00`);
  const rangeStart = new Date(
    firstDay.getFullYear(),
    firstDay.getMonth(),
    firstDay.getDate()
  );
  const timezone = localTimezone();

  const dayGroup = {
    $dateToString: { format: "%Y-%m-%d", date: "$__ts", timezone },
  };

  const build = (dateField, accumulator) => [
    { $match: { [dateField]: { $gte: rangeStart } } },
    { $set: { __ts: `$${dateField}` } },
    { $group: { _id: dayGroup, [accumulator]: { $sum: 1 } } },
  ];

  const [logins, progression, attempts, downloads] = await Promise.all([
    AuditLog.aggregate(build("timestamp", "logins")),
    ModuleProgress.aggregate(build("lastWatchedAt", "courseActive")),
    TestAttempt.aggregate([
      { $match: { courseId: { $ne: null } } },
      { $set: { __ts: "$attemptedAt" } },
      { $group: { _id: dayGroup, assessmentAttempts: { $sum: 1 } } },
    ]),
    AuditLog.aggregate([
      { $match: { timestamp: { $gte: rangeStart }, action: "DOWNLOAD" } },
      { $set: { __ts: "$timestamp" } },
      { $group: { _id: dayGroup, downloads: { $sum: 1 } } },
    ]),
  ]);

  const fields = ["logins", "courseActive", "assessmentAttempts", "downloads"];
  return denseDailySeries(
    [...logins, ...progression, ...attempts, ...downloads],
    days,
    fields
  );
}

/** Student cohort breakdown across every active department that has students. */
export async function getDepartmentDistribution() {
  const departments = await Department.find({ isActive: true }).select("_id code name color");
  const ids = departments.map((d) => d._id);

  const [studentRows, teacherRows, resourceRows] = await Promise.all([
    User.aggregate([
      { $match: { role: "student", departmentId: { $in: ids } } },
      {
        $group: {
          _id: "$departmentId",
          students: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } },
        },
      },
    ]),
    User.aggregate([
      { $match: { role: { $in: ["teacher", "faculty", "hod"] }, departmentId: { $in: ids } } },
      { $group: { _id: "$departmentId", teachers: { $sum: 1 } } },
    ]),
    Resource.aggregate([
      { $match: { departmentId: { $in: ids } } },
      { $group: { _id: "$departmentId", resources: { $sum: 1 } } },
    ]),
  ]);

  const index = (rows) => new Map(rows.map((row) => [String(row._id), row]));
  const studentsByDept = index(studentRows);
  const teachersByDept = index(teacherRows);
  const resourcesByDept = index(resourceRows);

  // Branches with no students are not part of the cohort distribution, so they
  // are dropped rather than reported as 0-student bars.
  const result = departments
    .map((dept) => ({
      departmentId: dept._id,
      code: dept.code,
      name: dept.name,
      shortName: dept.code,
      students: studentsByDept.get(String(dept._id))?.students || 0,
      activeStudents: studentsByDept.get(String(dept._id))?.active || 0,
      teachers: teachersByDept.get(String(dept._id))?.teachers || 0,
      resources: resourcesByDept.get(String(dept._id))?.resources || 0,
      color: dept.color || DEPARTMENT_COLORS[dept.code] || "#64748b",
    }))
    .filter((dept) => dept.students > 0);

  // Largest cohort first; equal counts fall back to the canonical order.
  result.sort((a, b) => {
    if (b.students !== a.students) return b.students - a.students;
    const ai = DEPARTMENT_ORDER.indexOf(a.code);
    const bi = DEPARTMENT_ORDER.indexOf(b.code);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const grandTotal = result.reduce((sum, dept) => sum + dept.students, 0);
  for (const dept of result) {
    dept.share = grandTotal > 0 ? Number(((dept.students / grandTotal) * 100).toFixed(1)) : 0;
  }

  return { total: grandTotal, branchCount: result.length, departments: result };
}

/**
 * Course completion velocity for the flagship courses shown on the dashboard:
 * enrollment, completion rate and assessment pass rate.
 */
export async function getCourseVelocity(limit = 5) {
  const courses = await Course.find({})
    .select("_id title slug isPublished")
    .sort({ createdAt: -1 })
    .limit(limit);

  if (courses.length === 0) return [];

  const courseIds = courses.map((c) => c._id);

  const [enrollmentRows, attemptRows] = await Promise.all([
    Enrollment.aggregate([
      { $match: { courseId: { $in: courseIds } } },
      {
        $group: {
          _id: "$courseId",
          enrollments: { $sum: 1 },
          completions: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
          },
        },
      },
    ]),
    TestAttempt.aggregate([
      { $match: { courseId: { $in: courseIds } } },
      {
        $group: {
          _id: "$courseId",
          attempts: { $sum: 1 },
          passed: { $sum: { $cond: ["$passed", 1, 0] } },
        },
      },
    ]),
  ]);

  const enrollmentsByCourse = new Map(enrollmentRows.map((r) => [String(r._id), r]));
  const attemptsByCourse = new Map(attemptRows.map((r) => [String(r._id), r]));

  return courses.map((course, index) => {
    const key = String(course._id);
    const enroll = enrollmentsByCourse.get(key);
    const attempt = attemptsByCourse.get(key);
    const completions = enroll?.completions || 0;
    const enrollments = enroll?.enrollments || 0;
    const attempts = attempt?.attempts || 0;

    return {
      courseId: course._id,
      name: course.title,
      slug: course.slug,
      isPublished: course.isPublished,
      enrollments,
      completions,
      inProgress: enroll?.inProgress || 0,
      attempts,
      passed: attempt?.passed || 0,
      rate: enrollments > 0 ? Math.round((completions / enrollments) * 100) : 0,
      passRate: attempts > 0 ? Math.round(((attempt.passed / attempts) * 100)) : 0,
      color: COURSE_VELOCITY_COLORS[index % COURSE_VELOCITY_COLORS.length],
    };
  });
}

const ACTIVITY_BADGES = {
  LOGIN: { badge: "Session", badgeColor: "bg-sky-50 text-sky-700 border-sky-200" },
  LOGOUT: { badge: "Session", badgeColor: "bg-slate-50 text-slate-700 border-slate-200" },
  CREATE: { badge: "Created", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  UPDATE: { badge: "Updated", badgeColor: "bg-blue-50 text-blue-700 border-blue-200" },
  DELETE: { badge: "Removed", badgeColor: "bg-red-50 text-red-700 border-red-200" },
  BLOCK: { badge: "Blocked", badgeColor: "bg-red-50 text-red-700 border-red-200" },
  UNBLOCK: { badge: "Restored", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PUBLISH: { badge: "Published", badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  UNPUBLISH: { badge: "Unpublished", badgeColor: "bg-amber-50 text-amber-700 border-amber-200" },
  DOWNLOAD: { badge: "Download", badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  CERTIFICATE_GENERATED: {
    badge: "Certificate",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  CERTIFICATE_REVOKED: { badge: "Revoked", badgeColor: "bg-red-50 text-red-700 border-red-200" },
};

const ACTIVITY_TITLES = {
  CERTIFICATE_GENERATED: "Certificate issued",
  CERTIFICATE_REVOKED: "Certificate revoked",
  PUBLISH: "Circular published",
  DOWNLOAD: "Resource downloaded",
};

/** Real-time stream of student and faculty events, sourced from the audit trail. */
export async function getRecentActivity(limit = 12) {
  const logs = await AuditLog.find({})
    .sort({ timestamp: -1 })
    .limit(Math.min(Math.max(Number(limit) || 12, 1), 50));

  return logs.map((log) => {
    const meta = ACTIVITY_BADGES[log.action] || {
      badge: log.action,
      badgeColor: "bg-slate-50 text-slate-700 border-slate-200",
    };
    const subject = log.userIdentifier || log.userName || "System";
    const title = ACTIVITY_TITLES[log.action] || `${log.resourceType} ${log.action.toLowerCase()}`;

    return {
      id: log._id,
      type: log.action,
      action: log.action,
      title,
      details: log.details,
      badge: meta.badge,
      badgeColor: meta.badgeColor,
      user: log.userName || subject,
      identifier: subject,
      role: log.role,
      resourceType: log.resourceType,
      timestamp: log.timestamp,
      time: log.timestamp,
    };
  });
}

/** Live visitor counter plus a seven-day traffic trend. */
export async function getVisitorStats(days = 7) {
  const trend = await Visitor.find({})
    .select("date totalVisits resourceViews courseViews announcementViews")
    .sort({ date: -1 })
    .limit(days);

  const byDate = new Map(trend.map((doc) => [doc.date, doc]));
  const series = denseDocumentSeries(trend, days, [
    "totalVisits",
    "resourceViews",
    "courseViews",
    "announcementViews",
  ]);

  const allTime = await Visitor.aggregate([
    { $match: { date: { $exists: true } } },
    { $group: { _id: null, total: { $sum: "$totalVisits" } } },
  ]);

  const globalRow = await Visitor.findOne({ key: "global_counter" }).select("totalVisits");

  return {
    // `total` is the sum of daily buckets, so it cannot drift away from the
    // trend above it the way a separate global counter can.
    total: allTime[0]?.total || 0,
    allTime: globalRow?.totalVisits || 0,
    today: byDate.get(toLocalDay(new Date()))?.totalVisits || 0,
    series,
    isLive: true,
  };
}

/**
 * System alert centre: exam violations, pending teacher uploads, suspended
 * accounts and recent certificate issuance. Empty states are omitted.
 */
export async function getAdminNotifications(limit = 15) {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86400000);
  const notifications = [];

  const [
    recentViolations,
    distinctViolators,
    pendingResources,
    suspendedUsers,
    recentCertificates,
  ] = await Promise.all([
    TestViolation.countDocuments({ timestamp: { $gte: dayAgo } }),
    TestViolation.distinct("studentId", { timestamp: { $gte: dayAgo } }),
    Resource.countDocuments({ isPublished: false }),
    User.countDocuments({ role: "student", isActive: false }),
    Certificate.countDocuments({ issuedAt: { $gte: dayAgo } }),
  ]);

  if (recentViolations > 0) {
    notifications.push({
      id: "violations-24h",
      severity: "warning",
      title: "Proctoring violations detected",
      message: `${recentViolations} violation${recentViolations === 1 ? "" : "s"} logged in the last 24 hours across ${distinctViolators.length} student${distinctViolators.length === 1 ? "" : "s"}.`,
      link: "/admin/violations",
      timestamp: now.toISOString(),
    });
  }

  if (pendingResources > 0) {
    notifications.push({
      id: "pending-resources",
      severity: "info",
      title: "Resources awaiting review",
      message: `${pendingResources} uploaded resource${pendingResources === 1 ? " is" : "s are"} still unpublished.`,
      link: "/admin/resources",
      timestamp: now.toISOString(),
    });
  }

  if (suspendedUsers > 0) {
    notifications.push({
      id: "suspended-students",
      severity: "danger",
      title: "Suspended student accounts",
      message: `${suspendedUsers} student account${suspendedUsers === 1 ? " is" : "s are"} currently blocked from the portal.`,
      link: "/admin/students",
      timestamp: now.toISOString(),
    });
  }

  if (recentCertificates > 0) {
    notifications.push({
      id: "certificates-24h",
      severity: "success",
      title: "Certificates issued",
      message: `${recentCertificates} certificate${recentCertificates === 1 ? " was" : "s were"} generated in the last 24 hours.`,
      link: "/admin/certificates",
      timestamp: now.toISOString(),
    });
  }

  return notifications.slice(0, Math.min(Math.max(Number(limit) || 15, 1), 50));
}

/** Everything the executive control center needs, in a single round trip. */
export async function getDashboardSummary(options = {}) {
  const days = Math.min(Math.max(Number(options.days) || 7, 1), 30);

  const [kpis, activityTelemetry, departmentData, courseVelocity, recentActivity, visitors] =
    await Promise.all([
      getKpiSummary(),
      getActivityTelemetry(days),
      getDepartmentDistribution(),
      getCourseVelocity(options.courseLimit || 5),
      getRecentActivity(options.activityLimit || 12),
      getVisitorStats(days),
    ]);

  return {
    generatedAt: new Date().toISOString(),
    kpis,
    activityTelemetry,
    departmentDistribution: departmentData.departments,
    departmentTotal: departmentData.total,
    branchCount: departmentData.branchCount,
    courseVelocity,
    recentActivity,
    visitors,
  };
}

/** Cross-entity search backing the Ctrl+K command palette. */
export async function searchAdminEntities(rawQuery, limit = 5) {
  const query = String(rawQuery || "").trim();
  if (query.length < 2) return { query, results: [] };

  const perGroup = Math.min(Math.max(Number(limit) || 5, 1), 20);
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = { $regex: safe, $options: "i" };

  const [users, courses, resources, announcements, assessments, subjects, certificates] =
    await Promise.all([
      User.find({
        $or: [{ name: regex }, { email: regex }, { registerNumber: regex }, { staffId: regex }],
      })
        .select("name email role registerNumber staffId departmentId isActive")
        .limit(perGroup),
      Course.find({ $or: [{ title: regex }, { category: regex }] })
        .select("title slug category isPublished")
        .limit(perGroup),
      Resource.find({ $or: [{ title: regex }, { tags: regex }] })
        .select("title type departmentId isPublished")
        .limit(perGroup),
      Announcement.find({ $or: [{ title: regex }, { description: regex }] })
        .select("title priority category isPinned isActive")
        .limit(perGroup),
      CourseAssessment.find({ title: regex }).select("title category difficulty isPublished").limit(perGroup),
      Subject.find({ $or: [{ name: regex }, { code: regex }] })
        .select("name code semester departmentId")
        .limit(perGroup),
      Certificate.find({
        $or: [{ certificateNumber: regex }, { studentName: regex }, { registerNumber: regex }],
      })
        .select("certificateNumber studentName courseName status")
        .limit(perGroup),
    ]);

  const groups = [];

  if (users.length) {
    groups.push({
      group: "People",
      type: "user",
      items: users.map((u) => ({
        id: u._id,
        title: u.name,
        subtitle: u.registerNumber || u.staffId || u.email,
        meta: u.role,
        link: (u.role === "teacher" || u.role === "faculty" || u.role === "hod") ? "/admin/teachers" : u.role === "admin" ? "/admin/settings" : "/admin/students",
      })),
    });
  }

  if (courses.length) {
    groups.push({
      group: "Courses",
      type: "course",
      items: courses.map((c) => ({
        id: c._id,
        title: c.title,
        subtitle: `${c.category}${c.isPublished ? "" : " · Draft"}`,
        link: "/admin/courses",
      })),
    });
  }

  if (resources.length) {
    groups.push({
      group: "Resources",
      type: "resource",
      items: resources.map((r) => ({
        id: r._id,
        title: r.title,
        subtitle: `${r.type}${r.isPublished ? "" : " · Unpublished"}`,
        link: "/admin/resources",
      })),
    });
  }

  if (announcements.length) {
    groups.push({
      group: "Announcements",
      type: "announcement",
      items: announcements.map((a) => ({
        id: a._id,
        title: a.title,
        subtitle: `${a.priority} priority`,
        link: "/admin/announcements",
      })),
    });
  }

  if (assessments.length) {
    groups.push({
      group: "Course Assessments",
      type: "course-assessment",
      items: assessments.map((assessment) => ({
        id: assessment._id,
        title: assessment.title,
        subtitle: `${assessment.category} · ${assessment.difficulty}`,
        link: "/admin/courses",
      })),
    });
  }

  if (subjects.length) {
    groups.push({
      group: "Subjects",
      type: "subject",
      items: subjects.map((s) => ({
        id: s._id,
        title: s.name,
        subtitle: `${s.code} · Semester ${s.semester}`,
        link: "/admin/subjects",
      })),
    });
  }

  if (certificates.length) {
    groups.push({
      group: "Certificates",
      type: "certificate",
      items: certificates.map((c) => ({
        id: c._id,
        title: c.studentName,
        subtitle: `${c.certificateNumber} · ${c.status}`,
        link: "/admin/certificates",
      })),
    });
  }

  return { query, groups };
}

/** Exposed for tests and for the Violations screen share. */
export async function getViolationTotals(windowHours = 24) {
  const since = new Date(Date.now() - windowHours * 3600000);
  const [total, byType, affectedStudents] = await Promise.all([
    TestViolation.countDocuments({ timestamp: { $gte: since } }),
    TestViolation.aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    TestViolation.distinct("studentId", { timestamp: { $gte: since } }),
  ]);

  return { total, byType, affectedStudents: affectedStudents.length };
}

export const __internal = { toLocalDay, recentDayKeys, localTimezone };
