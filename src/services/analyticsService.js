import { Course } from "../models/Course.js";
import { Enrollment } from "../models/Enrollment.js";
import { Visitor } from "../models/Visitor.js";
import { getKpiSummary, getDepartmentDistribution, getActivityTelemetry, __internal as dashboardInternal } from "./adminDashboardService.js";

export { getActivityTelemetry };

/** Mongo `$dateToString` timezone derived from the server offset, so `$dateToString`
 * day buckets match the local calendar day used by `toLocalDay`. */
export function localTimezone() {
  return dashboardInternal.localTimezone();
}

/**
 * Overview summary for the analytics dashboard. The nested `kpis` object is the
 * authoritative shape; the flat keys are retained for backward compatibility
 * with existing consumers.
 */
export async function getOverviewSummary() {
  const kpis = await getKpiSummary();

  return {
    kpis,
    totalStudents: kpis.students.total,
    totalTeachers: kpis.teachers.total,
    totalDepartments: kpis.teachers.departments,
    totalResources: kpis.resources.total,
    totalCourses: kpis.courses.total,
    certificatesIssued: kpis.certificates.issued,
    visitorsToday: kpis.visitors.today,
    visitorGrowth: kpis.visitors.growthPercent,
    activeOnline: kpis.activeUsers.count,
  };
}

export async function getDepartmentAnalytics() {
  const { departments } = await getDepartmentDistribution();
  return departments;
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

/**
 * The counter runs on local calendar days, matching the admin dashboard, so the
 * two agree on what "today" means. `toISOString()` would bucket by UTC and drift
 * by a day either side of midnight.
 */
function toLocalDay(input) {
  const date = input instanceof Date ? input : new Date(input);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const VISIT_TYPE_FIELDS = {
  resource: "resourceViews",
  course: "courseViews",
  announcement: "announcementViews",
};

/** Daily total for every tracked day, plus the running all-time count. */
async function visitorTotals() {
  const [allTime, globalRow] = await Promise.all([
    Visitor.aggregate([
      { $match: { date: { $exists: true } } },
      { $group: { _id: null, total: { $sum: "$totalVisits" } } },
    ]),
    Visitor.findOne({ key: "global_counter" }).select("totalVisits"),
  ]);

  return {
    count: allTime[0]?.total || 0,
    allTime: globalRow?.totalVisits || 0,
  };
}

export async function getVisitorAnalytics(days = 7) {
  const keys = [];
  const now = new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    keys.push(toLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset)));
  }

  const docs = await Visitor.find({ date: { $in: keys } })
    .select("date totalVisits resourceViews courseViews announcementViews");
  const byDate = new Map(docs.map((doc) => [doc.date, doc]));

  // Dense, zero-filled and oldest-first so a chart never has gaps.
  return keys.map((key) => {
    const doc = byDate.get(key) || {};
    return {
      date: key,
      totalVisits: doc.totalVisits || 0,
      resourceViews: doc.resourceViews || 0,
      courseViews: doc.courseViews || 0,
      announcementViews: doc.announcementViews || 0,
    };
  });
}

/** Atomic per-day + per-type increment. */
export async function recordVisitorHit(type = "visit") {
  const now = new Date();
  const today = toLocalDay(now);
  const field = VISIT_TYPE_FIELDS[type];

  const [daily, global] = await Promise.all([
    Visitor.findOneAndUpdate(
      { date: today },
      {
        $inc: { totalVisits: 1, ...(field ? { [field]: 1 } : {}) },
        $set: { updatedAt: now },
        $setOnInsert: { date: today },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ),
    Visitor.findOneAndUpdate(
      { key: "global_counter" },
      {
        $inc: { totalVisits: 1 },
        $set: { updatedAt: now },
        $setOnInsert: { key: "global_counter" },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ),
  ]);

  return { count: global.totalVisits, today: daily.totalVisits, isLive: true };
}

export async function getVisitorTotals() {
  const today = toLocalDay(new Date());
  const [totals, todayDoc] = await Promise.all([
    visitorTotals(),
    Visitor.findOne({ date: today }).select("totalVisits"),
  ]);

  return { ...totals, today: todayDoc?.totalVisits || 0, isLive: true };
}
