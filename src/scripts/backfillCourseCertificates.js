/**
 * One-off migration: repair course completion certificates.
 *
 * Two historical defects left students with no visible course certificate:
 *
 *  1. generateCourseCertificate() created the Certificate without a `type`, so
 *     Mongoose applied the schema default "module_appreciation". Every course
 *     certificate was filed as a module certificate.
 *  2. Its duplicate guard queried { studentId, courseId } with no type filter.
 *     Module appreciation certificates share that same pair, so as soon as a
 *     student had passed a single module test the guard matched and returned
 *     the module certificate instead of minting the course one.
 *
 * This script relabels course-level certificates that were stored as module
 * ones, then issues a missing course certificate for every completed
 * enrollment.
 *
 * Usage: npm run backfill:certificates
 */
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { Certificate } from "../models/Certificate.js";
import { CourseModule } from "../models/CourseModule.js";
import { Enrollment } from "../models/Enrollment.js";
import { issueCertificate } from "../services/certificateService.js";

async function run() {
  await connectDB();

  // 1. Relabel certificates that are course-level (no moduleId) but were saved
  //    with the schema default "module_appreciation". Genuine module
  //    certificates always carry a moduleId, so they are left untouched.
  const relabelled = await Certificate.updateMany(
    { type: "module_appreciation", moduleId: null },
    { $set: { type: "course_completion" } }
  );

  // 2. Issue a course certificate for every student who has actually finished a
  //    course. Completion is derived from completedModules vs the published
  //    module count rather than progressPercentage, because the test-pass path
  //    never recomputed that field, so a finished course can still read 0%.
  const enrollments = await Enrollment.find({});
  const moduleCounts = new Map();
  for (const courseId of new Set(enrollments.map((e) => e.courseId.toString()))) {
    const count = await CourseModule.countDocuments({
      courseId,
      isPublished: true,
    });
    moduleCounts.set(courseId, count);
  }

  let issued = 0;
  let alreadyHad = 0;
  let repaired = 0;
  const failures = [];

  for (const enrollment of enrollments) {
    const totalModules = moduleCounts.get(enrollment.courseId.toString());
    if (!totalModules) continue;

    const done = enrollment.completedModules?.length || 0;
    const isComplete = done >= totalModules;

    // Keep progressPercentage honest for everyone, not just completers.
    const expected = Math.min(Math.round((done / totalModules) * 100), 100);
    if (enrollment.progressPercentage !== expected) {
      enrollment.progressPercentage = expected;
    }

    if (!isComplete) {
      if (enrollment.status === "completed") {
        enrollment.status = "in_progress";
        await enrollment.save();
        repaired += 1;
      } else {
        await enrollment.save();
      }
      continue;
    }

    if (enrollment.status !== "completed") {
      enrollment.status = "completed";
      enrollment.completedAt = enrollment.completedAt || new Date();
      repaired += 1;
    }
    await enrollment.save();

    const existing = await Certificate.findOne({
      studentId: enrollment.studentId,
      courseId: enrollment.courseId,
      type: "course_completion",
    });
    if (existing) {
      alreadyHad += 1;
      continue;
    }

    // Prefer a real score from the module tests; fall back to a passing grade.
    const modules = await CourseModule.find({ courseId: enrollment.courseId, isPublished: true });
    const moduleIds = modules.map((m) => m._id.toString());
    const scored = await mongoose.connection
      .collection("moduleprogresses")
      .find(
        { studentId: enrollment.studentId, courseId: enrollment.courseId, testPassed: true },
        { projection: { testScore: 1, moduleId: 1 } }
      )
      .toArray();

    const relevant = scored.filter(
      (p) => !p.moduleId || moduleIds.includes(p.moduleId.toString())
    );
    const average = relevant.length
      ? Math.round(relevant.reduce((sum, p) => sum + (p.testScore || 0), 0) / relevant.length)
      : 100;

    try {
      await issueCertificate({
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        score: average,
      });
      issued += 1;
    } catch (error) {
      failures.push(`${enrollment.studentId}/${enrollment.courseId}: ${error.message}`);
    }
  }

  console.log(
    [
      "[backfill:certificates] relabelled as course completion: ", relabelled.modifiedCount,
      "[backfill:certificates] enrollments repaired:           ", repaired,
      "[backfill:certificates] newly issued:                   ", issued,
      "[backfill:certificates] already present:                ", alreadyHad,
      "[backfill:certificates] failed:                          ", failures.length,
      ...failures.map((f) => `  - ${f}`),
    ].join("\n")
  );
}

run()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("[backfill:certificates] failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  });
