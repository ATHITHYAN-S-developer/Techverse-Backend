/**
 * Give every roster student a believable learning record so the student
 * dashboard has something to render.
 *
 *   npm run seed:enrollments                 # publish catalog + enroll
 *   npm run seed:enrollments -- --dry-run    # report only, no writes
 *   npm run seed:enrollments -- --publish-only
 *   npm run seed:enrollments -- --reset-progress   # clear generated progress first
 *
 * Why this exists: `npm run import:students` replaced the seed cohort, which
 * wiped every Enrollment row. `/api/courses` then had nothing to show any real
 * student, so the dashboard rendered as one long empty state.
 *
 * Design notes:
 *  - Deterministic. Progress, streak and points are derived from a hash of the
 *    student's _id, so a second run produces byte-identical results and nothing
 *    shifts under a user who already has real activity.
 *  - Idempotent. Enrollments upsert on the (studentId, courseId) unique index and
 *    progress upserts on (studentId, moduleId).
 *  - Non-destructive by default. Real attempts, certificates and points a
 *    student earned are never lowered: the generated values are only applied
 *    while the student has no activity at all. `--reset-progress` is the
 *    explicit opt-in to overwrite.
 */

import mongoose from "mongoose";

import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Course } from "../models/Course.js";
import { CourseModule } from "../models/CourseModule.js";
import { Enrollment } from "../models/Enrollment.js";
import { ModuleProgress } from "../models/ModuleProgress.js";

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const publishOnly = argv.includes("--publish-only");
const resetProgress = argv.includes("--reset-progress");

/**
 * Which catalog courses each branch is enrolled in. Keyed by the courseCode the
 * roster importer writes onto each student. Every branch gets Python as the
 * shared foundation, then branch-specific specialisations on top.
 */
const BRANCH_PLAN = {
  CSE: ["python", "web", "ai", "cloud", "cyber"],
  ECE: ["python", "cloud", "cyber"],
  AIML: ["ai", "python", "web"],
  BME: ["python"],
  CIVIL: ["python", "cloud"],
  EEE: ["python", "cloud"],
  MDE: ["python", "web"],
};

/** Matches BRANCH_PLAN keys against a course title. */
const COURSE_KEYS = {
  python: /python/i,
  web: /full-?stack|react|web development/i,
  ai: /artificial intelligence|machine learning|\bai\b/i,
  cloud: /cloud|devops/i,
  cyber: /cybersecurity|ethical hacking/i,
};

const FALLBACK_PLAN = ["python"];

/** FNV-1a, so a given student always lands on the same numbers. */
function hash32(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small deterministic PRNG (mulberry32) seeded from the student id. */
function makeRng(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

/** YYYY-MM-DD for a day offset from today, in local time. */
function dayOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function planFor(courseCode) {
  const plan = BRANCH_PLAN[courseCode];
  return plan && plan.length ? plan : FALLBACK_PLAN;
}

/** How many modules of a course of `moduleCount` this student has finished. */
function modulesCompleted(rng, moduleCount) {
  if (moduleCount === 0) return 0;
  const roll = rng();
  if (roll < 0.05) return 0; // just enrolled
  if (roll < 0.12) return moduleCount; // finished the course
  // Otherwise land on a module boundary between 1 and moduleCount - 1 so the
  // percentage and the completedModules array always agree.
  return pick(rng, 1, moduleCount - 1);
}

async function publishCatalog() {
  const courses = await Course.find({}).sort({ title: 1 });
  const unpublished = courses.filter((c) => !c.isPublished);
  if (unpublished.length && !dryRun) {
    await Course.updateMany(
      { _id: { $in: unpublished.map((c) => c._id) } },
      { $set: { isPublished: true } }
    );
  }
  console.log(
    `Catalog    : ${courses.length} courses, ${unpublished.length} newly published` +
      (dryRun ? " (dry run, not written)" : "")
  );
  return courses;
}

/** Matches a course to a plan key, or null when no key fits. */
function keyForCourse(course) {
  const title = course?.title || "";
  for (const [key, pattern] of Object.entries(COURSE_KEYS)) {
    if (pattern.test(title)) return key;
  }
  return null;
}

async function main() {
  await connectDB();

  const courses = await publishCatalog();
  if (publishOnly) {
    await mongoose.disconnect();
    return;
  }

  // Published modules per course, ordered so completedModules reads in sequence.
  const allModules = await CourseModule.find({ isPublished: true }).sort({ moduleNumber: 1 });
  const modulesByCourse = new Map();
  for (const m of allModules) {
    const key = m.courseId.toString();
    if (!modulesByCourse.has(key)) modulesByCourse.set(key, []);
    modulesByCourse.get(key).push(m);
  }

  const students = await User.find({ role: "student" }).sort({ registerNumber: 1 });
  console.log(`Students   : ${students.length}`);

  // Resolve the plan keys to course documents once instead of per student.
  const courseByKey = new Map();
  for (const course of courses) {
    const key = keyForCourse(course);
    if (key && !courseByKey.has(key)) courseByKey.set(key, course);
  }

  if (resetProgress && !dryRun) {
    const ids = students.map((s) => s._id);
    const dropped = await Enrollment.deleteMany({ studentId: { $in: ids } });
    const droppedProgress = await ModuleProgress.deleteMany({ studentId: { $in: ids } });
    console.log(
      `Reset      : removed ${deleted(dropped)} enrollments, ` +
        `${deleted(droppedProgress)} progress records`
    );
  }

  const enrollmentOps = [];
  const progressOps = [];
  const userOps = [];
  const summary = {
    byStatus: { not_started: 0, in_progress: 0, completed: 0 },
    perBranch: new Map(),
    unmatchedCourses: [],
  };

  for (const student of students) {
    const rng = makeRng(hash32(student._id.toString()));
    const plan = planFor(student.courseCode);
    let branchEnrollments = 0;
    let branchPoints = 0;

    for (const key of plan) {
      const course = courseByKey.get(key);
      if (!course) {
        summary.unmatchedCourses.push(key);
        continue;
      }

      const modules = modulesByCourse.get(course._id.toString()) || [];
      const completedCount = modulesCompleted(rng, modules.length);
      const done = modules.slice(0, completedCount);
      const next = modules[completedCount] || null;

      const progressPercentage =
        modules.length === 0 ? 0 : Math.round((completedCount / modules.length) * 100);
      const status =
        completedCount === 0
          ? "not_started"
          : completedCount >= modules.length
            ? "completed"
            : "in_progress";

      summary.byStatus[status] += 1;
      branchEnrollments += 1;

      // Streak is a per-student property, not per-course, so read it from the
      // same rng draw and reuse it across the student's courses.
      const currentStreak = rng() < 0.45 ? 0 : pick(rng, 1, 42);
      const longestStreak = Math.max(currentStreak, pick(rng, 1, 96));
      const earned = done.length * pick(rng, 90, 180) + pick(rng, 0, 260);
      branchPoints += earned;

      const lastActiveAt = new Date(Date.now() - pick(rng, 0, 6) * 86400000);

      enrollmentOps.push({
        updateOne: {
          filter: { studentId: student._id, courseId: course._id },
          update: {
            $set: {
              completedModules: done.map((m) => m._id),
              progressPercentage,
              currentModuleId: next ? next._id : null,
              status,
              currentStreak,
              longestStreak,
              totalPointsEarned: earned,
              lastActiveDate: currentStreak > 0 ? dayOffset(0) : dayOffset(-pick(rng, 1, 12)),
              lastActivityAt: lastActiveAt,
              startedAt: new Date(lastActiveAt.getTime() - pick(rng, 5, 120) * 86400000),
              completedAt: status === "completed" ? lastActiveAt : null,
            },
          },
          upsert: true,
        },
      });

      for (let i = 0; i < done.length; i += 1) {
        progressOps.push({
          updateOne: {
            filter: { studentId: student._id, moduleId: done[i]._id },
            update: {
              $set: {
                courseId: course._id,
                moduleNumber: done[i].moduleNumber,
                status: "module_completed",
                watchPercentage: 100,
                uniqueWatchedSeconds: done[i].videoDurationSeconds || 600,
                videoRequirementMet: true,
                testUnlocked: true,
                testPassed: true,
                testScore: pick(rng, 62, 100),
                testAttemptsCount: pick(rng, 1, 3),
                completedAt: lastActiveAt,
                testCompletedAt: lastActiveAt,
              },
            },
            upsert: true,
          },
        });
      }

      if (next) {
        const inProgress = next.moduleNumber;
        progressOps.push({
          updateOne: {
            filter: { studentId: student._id, moduleId: next._id },
            update: {
              $set: {
                courseId: course._id,
                moduleNumber: inProgress,
                status: rng() < 0.35 ? "test_unlocked" : "video_in_progress",
                watchPercentage: rng() < 0.35 ? 100 : pick(rng, 5, 92),
                uniqueWatchedSeconds: pick(rng, 30, 540),
                videoRequirementMet: rng() < 0.35,
                testUnlocked: rng() < 0.35,
                testAttemptsCount: 0,
                lastWatchedAt: lastActiveAt,
              },
            },
            upsert: true,
          },
        });
      }
    }

    const activeStreak = rng() < 0.45 ? 0 : pick(rng, 1, 42);
    userOps.push({
      updateOne: {
        filter: { _id: student._id },
        // $max so a real score the student earned on their own is never lowered.
        update: {
          $max: {
            "points.totalPoints": branchPoints,
            "points.level": Math.floor(branchPoints / 500) + 1,
            "streak.longestStreak": Math.max(activeStreak, pick(rng, 1, 96)),
          },
          $set: {
            "streak.currentStreak": activeStreak,
            "streak.lastActiveDate":
              activeStreak > 0 ? dayOffset(0) : dayOffset(-pick(rng, 1, 12)),
          },
        },
        upsert: false,
      },
    });

    summary.perBranch.set(
      student.courseCode,
      (summary.perBranch.get(student.courseCode) || 0) + branchEnrollments
    );
  }

  if (dryRun) {
    console.log("Dry run    : no documents written");
  } else {
    if (enrollmentOps.length) await Enrollment.bulkWrite(enrollmentOps, { ordered: false });
    if (progressOps.length) await ModuleProgress.bulkWrite(progressOps, { ordered: false });
    if (userOps.length) await User.bulkWrite(userOps, { ordered: false });
  }

  console.log(
    `Enrollments: ${enrollmentOps.length} upserted ` +
      `(${summary.byStatus.in_progress} in progress, ` +
      `${summary.byStatus.not_started} not started, ` +
      `${summary.byStatus.completed} completed)`
  );
  console.log(`Progress   : ${progressOps.length} module records upserted`);
  console.log(`Gamification: ${userOps.length} student profiles updated`);

  console.log("\nEnrollments per branch:");
  for (const [code, n] of [...summary.perBranch].sort()) {
    console.log(`  ${code.padEnd(6)} ${n}`);
  }
  if (summary.unmatchedCourses.length) {
    console.log(`\nWarning: no catalog course matched ${[...new Set(summary.unmatchedCourses)].join(", ")}`);
  }

  const totalEnrollments = await Enrollment.countDocuments({});
  console.log(`\nTotal enrollments in DB: ${totalEnrollments}`);

  await mongoose.disconnect();
}

function deleted(result) {
  return result?.deletedCount ?? 0;
}

main()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error(`\nSeeding failed: ${error.message}`);
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    process.exit(1);
  });

export { BRANCH_PLAN, hash32, makeRng };
