import mongoose from "mongoose";
import { ModuleProgress } from "../models/ModuleProgress.js";
import { CourseModule } from "../models/CourseModule.js";
import { Course } from "../models/Course.js";
import { Enrollment } from "../models/Enrollment.js";
import { Certificate } from "../models/Certificate.js";
import { User } from "../models/User.js";
import { generateCertificateNumber } from "../utils/generateId.js";
import { awardPoints } from "./pointsService.js";

const SEGMENT_DURATION_SECONDS = 5; // Each discrete slice is 5 seconds
const MIN_WATCH_PERCENTAGE = 40; // 40% unique watch requirement
const MIN_TEST_PASS_PERCENTAGE = 50; // 50% passing score

/**
 * Checks if the entire course has been completed by the student.
 * If completed, all limitations are removed: student can freely view any module
 * and attend any test at any time in that course.
 */
export async function isCourseCompletedForStudent(studentId, courseId) {
  if (!studentId || !courseId) return false;

  const enrollment = await Enrollment.findOne({ studentId, courseId });
  if (enrollment && (enrollment.status === "completed" || enrollment.progressPercentage >= 100)) {
    return true;
  }

  const modules = await CourseModule.find({ courseId, isPublished: true });
  if (modules.length === 0) return false;

  const passedProgressCount = await ModuleProgress.countDocuments({
    studentId,
    courseId,
    testPassed: true,
  });

  if (passedProgressCount >= modules.length) {
    return true;
  }

  if (enrollment?.completedModules && enrollment.completedModules.length >= modules.length) {
    return true;
  }

  return false;
}

/**
 * Checks if a module is currently unlocked and accessible for a student.
 * Module 1 is always accessible to enrolled students.
 * Module N is unlocked if Module N-1 is completed / test passed,
 * OR if the student has completed the entire course.
 */
export async function isModuleUnlockedForStudent(studentId, courseId, moduleNumber) {
  if (moduleNumber <= 1) return true;

  const isCourseDone = await isCourseCompletedForStudent(studentId, courseId);
  if (isCourseDone) return true;

  // Check if previous module (moduleNumber - 1) has a progress record
  const prevProgress = await ModuleProgress.findOne({
    studentId,
    courseId,
    moduleNumber: moduleNumber - 1,
  });

  if (prevProgress) {
    return Boolean(prevProgress.testPassed);
  }

  // Fallback to Enrollment.completedModules if no ModuleProgress record exists yet
  const prevModule = await CourseModule.findOne({ courseId, moduleNumber: moduleNumber - 1 });
  if (prevModule) {
    const enrollment = await Enrollment.findOne({
      studentId,
      courseId,
      completedModules: prevModule._id,
    });
    if (enrollment) return true;
  }

  return false;
}

/**
 * Get or initialize a ModuleProgress record for a student
 */
export async function getOrCreateModuleProgress(studentId, courseId, moduleId) {
  let moduleDoc = null;
  if (mongoose.Types.ObjectId.isValid(moduleId)) {
    moduleDoc = await CourseModule.findById(moduleId);
  }
  if (!moduleDoc) {
    moduleDoc = await CourseModule.findOne({
      $or: [{ _id: moduleId }, { moduleNumber: Number(moduleId) }],
      courseId,
    });
  }

  if (!moduleDoc) {
    throw new Error("Course Module not found.");
  }

  const isCourseDone = await isCourseCompletedForStudent(studentId, courseId);
  const isUnlocked = isCourseDone || (await isModuleUnlockedForStudent(studentId, courseId, moduleDoc.moduleNumber));

  let progress = await ModuleProgress.findOne({ studentId, moduleId: moduleDoc._id });

  if (!progress) {
    progress = await ModuleProgress.create({
      studentId,
      courseId,
      moduleId: moduleDoc._id,
      moduleNumber: moduleDoc.moduleNumber,
      status: isUnlocked ? "video_in_progress" : "video_locked",
      watchedSegments: [],
      videoDurationSeconds: 0,
      uniqueWatchedSeconds: 0,
      watchPercentage: 0,
      videoRequirementMet: isCourseDone,
      testUnlocked: isCourseDone,
    });
  } else if (isCourseDone) {
    progress.videoRequirementMet = true;
    progress.testUnlocked = true;
  }

  return { progress, moduleDoc, isUnlocked, isCourseDone };
}

/**
 * Record genuine video watch progress using discretized 5-second segments.
 * Prevents seeking/skipping cheating by only counting uniquely reported valid segments.
 */
export async function recordVideoWatchProgress(studentId, courseId, moduleId, payload) {
  const { progress, moduleDoc, isUnlocked } = await getOrCreateModuleProgress(studentId, courseId, moduleId);

  if (!isUnlocked) {
    const err = new Error(`Module ${moduleDoc.moduleNumber} is locked. Complete previous modules first.`);
    err.status = 403;
    throw err;
  }

  const duration = Number(payload.duration || payload.videoDuration || 0);
  const currentTime = Number(payload.currentTime || 0);
  const playbackRate = Number(payload.playbackRate || 1);

  // Validate playback rate (ignore unrealistic speeds > 3x)
  if (playbackRate < 0.25 || playbackRate > 3) {
    return {
      success: false,
      message: "Abnormal playback speed ignored.",
      watchPercentage: progress.watchPercentage,
      videoRequirementMet: progress.videoRequirementMet,
      testUnlocked: progress.testUnlocked,
    };
  }

  // Determine segments to add
  const incomingSegments = [];
  if (Array.isArray(payload.segments)) {
    payload.segments.forEach((s) => {
      const num = parseInt(s, 10);
      if (!isNaN(num) && num >= 0) incomingSegments.push(num);
    });
  } else if (typeof payload.segmentIndex === "number") {
    incomingSegments.push(payload.segmentIndex);
  } else if (currentTime >= 0) {
    const segIdx = Math.floor(currentTime / SEGMENT_DURATION_SECONDS);
    incomingSegments.push(segIdx);
  }

  // Update video duration if provided and reasonable
  if (duration > 0 && (progress.videoDurationSeconds === 0 || Math.abs(progress.videoDurationSeconds - duration) > 10)) {
    progress.videoDurationSeconds = Math.round(duration);
  }

  const effectiveDuration = progress.videoDurationSeconds || (duration > 0 ? Math.round(duration) : 600);
  const maxPossibleSegment = Math.ceil(effectiveDuration / SEGMENT_DURATION_SECONDS) + 2;

  // Filter valid segments
  const currentSegmentsSet = new Set(progress.watchedSegments || []);
  incomingSegments.forEach((seg) => {
    if (seg >= 0 && seg <= maxPossibleSegment) {
      currentSegmentsSet.add(seg);
    }
  });

  const updatedSegments = Array.from(currentSegmentsSet).sort((a, b) => a - b);
  progress.watchedSegments = updatedSegments;

  // Calculate unique watched seconds & percentage
  const uniqueSeconds = Math.min(effectiveDuration, updatedSegments.length * SEGMENT_DURATION_SECONDS);
  progress.uniqueWatchedSeconds = uniqueSeconds;

  const percentage = effectiveDuration > 0
    ? Math.min(100, Math.round((uniqueSeconds / effectiveDuration) * 100))
    : 0;

  progress.watchPercentage = percentage;
  progress.lastWatchedAt = new Date();

  // Check 40% watch requirement threshold
  if (percentage >= MIN_WATCH_PERCENTAGE) {
    progress.videoRequirementMet = true;
    progress.testUnlocked = true;
    if (progress.status === "video_in_progress" || progress.status === "video_locked") {
      progress.status = "test_unlocked";
    }
  }

  await progress.save();

  // Also ensure enrollment exists
  await Enrollment.findOneAndUpdate(
    { studentId, courseId },
    { $set: { status: "in_progress", lastActivityAt: new Date() } },
    { upsert: true }
  );

  return {
    success: true,
    moduleId: moduleDoc._id,
    moduleNumber: moduleDoc.moduleNumber,
    uniqueWatchedSeconds: progress.uniqueWatchedSeconds,
    videoDurationSeconds: progress.videoDurationSeconds,
    watchPercentage: progress.watchPercentage,
    requiredPercentage: MIN_WATCH_PERCENTAGE,
    videoRequirementMet: progress.videoRequirementMet,
    testUnlocked: progress.testUnlocked,
    status: progress.status,
  };
}

/**
 * Get comprehensive progression map for all modules in a course for a student
 */
export async function getCourseProgressionMap(studentId, courseId) {
  const course = await Course.findById(courseId) || await Course.findOne({ slug: courseId });
  if (!course) throw new Error("Course not found.");

  const isCourseDone = await isCourseCompletedForStudent(studentId, course._id);
  const modules = await CourseModule.find({ courseId: course._id, isPublished: true }).sort({ moduleNumber: 1, order: 1 });
  const progresses = await ModuleProgress.find({ studentId, courseId: course._id });
  const certificates = await Certificate.find({ studentId, courseId: course._id });

  const progressMap = new Map();
  progresses.forEach((p) => {
    progressMap.set(p.moduleId.toString(), p);
  });

  const certMap = new Map();
  certificates.forEach((c) => {
    if (c.moduleId) certMap.set(c.moduleId.toString(), c);
  });

  let previousModuleCompleted = true; // Module 1 starts accessible

  const moduleProgression = modules.map((m, index) => {
    const mIdStr = m._id.toString();
    const p = progressMap.get(mIdStr);
    const cert = certMap.get(mIdStr);

    const isPassed = Boolean(p?.testPassed);
    const isUnlocked = isCourseDone || previousModuleCompleted;

    // Next module is accessible if current module is passed
    previousModuleCompleted = isPassed;

    let computedStatus = "video_locked";
    if (!isUnlocked) {
      computedStatus = "video_locked";
    } else if (isPassed) {
      computedStatus = cert ? "module_completed" : "test_passed";
    } else if (p?.videoRequirementMet || isCourseDone) {
      computedStatus = p?.testScore !== null && p?.testScore !== undefined ? "test_failed" : "test_unlocked";
    } else if (isUnlocked) {
      computedStatus = "video_in_progress";
    }

    const videoReqMet = isCourseDone || Boolean(p?.videoRequirementMet);
    const testUnlocked = isCourseDone || Boolean(p?.testUnlocked && isUnlocked) || Boolean(p?.videoRequirementMet);

    return {
      moduleId: m._id,
      moduleNumber: m.moduleNumber || index + 1,
      title: m.title,
      description: m.description,
      videoUrl: m.videoUrl,
      isUnlocked,
      status: p?.status || computedStatus,
      watchPercentage: p?.watchPercentage || (isCourseDone ? 100 : 0),
      uniqueWatchedSeconds: p?.uniqueWatchedSeconds || 0,
      videoDurationSeconds: p?.videoDurationSeconds || 0,
      videoRequirementMet: videoReqMet,
      testUnlocked: testUnlocked,
      testScore: p?.testScore ?? null,
      testPassed: isPassed,
      testAttemptsCount: p?.testAttemptsCount || 0,
      certificate: cert ? {
        id: cert._id,
        certificateNumber: cert.certificateNumber,
        score: cert.score,
        issuedAt: cert.issuedAt,
        verificationCode: cert.verificationCode,
      } : null,
    };
  });

  const completedCount = moduleProgression.filter((m) => m.testPassed).length;
  const overallProgress = modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0;

  return {
    courseId: course._id,
    courseTitle: course.title,
    courseSlug: course.slug,
    totalModules: modules.length,
    completedModulesCount: completedCount,
    overallProgress,
    isCourseCompleted: isCourseDone || overallProgress >= 100,
    modules: moduleProgression,
  };
}

/**
 * Grade module test submitted by student, verify 40% watch requirement (bypassed if course is completed),
 * and if score >= 50%, generate Appreciation Certificate and unlock next module.
 */
export async function submitModuleTest(studentId, courseId, moduleId, payload) {
  const { progress, moduleDoc, isUnlocked, isCourseDone } = await getOrCreateModuleProgress(studentId, courseId, moduleId);

  if (!isUnlocked && !isCourseDone) {
    const err = new Error(`Module ${moduleDoc.moduleNumber} is locked. Complete previous modules first.`);
    err.status = 403;
    throw err;
  }

  // 1. Server-Side Guard: Verify video watch requirement (Bypassed if course is already completed or module was passed)
  if (!isCourseDone && !progress.testPassed && (!progress.videoRequirementMet || progress.watchPercentage < MIN_WATCH_PERCENTAGE)) {
    const err = new Error(`Test Locked: You must watch at least ${MIN_WATCH_PERCENTAGE}% of the tutorial video before taking the test (Current: ${progress.watchPercentage}%).`);
    err.status = 403;
    err.code = "VIDEO_WATCH_REQUIREMENT_NOT_MET";
    throw err;
  }

  const userAnswersRaw = payload.answers || payload.userAnswers || {};
  const mcqs = moduleDoc.mcqs || [];

  if (mcqs.length === 0) {
    throw new Error("This module does not contain test questions.");
  }

  // 2. Grade each question securely on the server
  let correctCount = 0;
  const gradedQuestions = mcqs.map((q, idx) => {
    const userSelected = userAnswersRaw[idx] ?? userAnswersRaw[String(idx)] ?? userAnswersRaw[q._id?.toString()];
    const correctIdx = typeof q.correctAnswer === "number" ? q.correctAnswer : 0;
    const correctText = q.correctAnswerText || (q.options ? q.options[correctIdx] : "");

    let isCorrect = false;
    if (userSelected !== undefined && userSelected !== null) {
      if (typeof userSelected === "number") {
        isCorrect = userSelected === correctIdx;
      } else if (typeof userSelected === "string" && q.options) {
        isCorrect = q.options[Number(userSelected)]?.trim().toLowerCase() === correctText.trim().toLowerCase()
          || userSelected.trim().toLowerCase() === correctText.trim().toLowerCase();
      }
    }

    if (isCorrect) correctCount++;

    return {
      questionIndex: idx,
      questionText: q.question,
      options: q.options,
      selectedAnswer: userSelected,
      correctAnswer: correctIdx,
      correctAnswerText: correctText,
      explanation: q.explanation || "",
      isCorrect,
    };
  });

  const totalQuestions = mcqs.length;
  const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
  const passed = scorePercentage >= MIN_TEST_PASS_PERCENTAGE;

  progress.testAttemptsCount = (progress.testAttemptsCount || 0) + 1;
  progress.testScore = scorePercentage;
  progress.testPassed = passed;
  progress.testCompletedAt = new Date();

  const studentUser = await User.findById(studentId);
  const course = await Course.findById(courseId);

  let certificate = null;

  if (passed) {
    // 3. Mark module completed
    progress.status = "module_completed";
    progress.completedAt = new Date();

    // 4. Automatically generate Appreciation Certificate if not already generated
    let existingCert = await Certificate.findOne({
      studentId,
      courseId,
      moduleId: moduleDoc._id,
      type: "module_appreciation",
    });

    if (!existingCert) {
      const totalCerts = await Certificate.countDocuments();
      const certNumber = generateCertificateNumber(`MOD${moduleDoc.moduleNumber}`, totalCerts + 1);
      const verificationCode = `0x${Math.random().toString(16).substring(2, 10).toUpperCase()}`;

      existingCert = await Certificate.create({
        certificateNumber: certNumber,
        studentId,
        courseId,
        type: "module_appreciation",
        moduleId: moduleDoc._id,
        moduleNumber: moduleDoc.moduleNumber,
        moduleTitle: moduleDoc.title,
        studentName: studentUser?.name || "VCET Engineering Scholar",
        registerNumber: studentUser?.registerNumber || "732921104001",
        courseName: course?.title || "Course",
        instructorName: course?.instructorName || course?.instructor || "VCET Faculty Lead",
        score: scorePercentage,
        grade: scorePercentage >= 85 ? "Distinction" : scorePercentage >= 70 ? "First Class" : "Pass",
        verificationCode,
        status: "valid",
        issuedAt: new Date(),
      });
    }

    certificate = existingCert;
    progress.certificateId = existingCert._id;

    // 5. Update Enrollment
    await Enrollment.findOneAndUpdate(
      { studentId, courseId },
      {
        $addToSet: { completedModules: moduleDoc._id },
        $set: { lastActivityAt: new Date() },
      },
      { upsert: true }
    );

    // Award Points (+50 test pass XP, +100 module completion XP)
    try {
      await awardPoints({
        studentId,
        points: 150,
        type: "module_completion",
        description: `Passed Module ${moduleDoc.moduleNumber} Test with score ${scorePercentage}%`,
        referenceId: existingCert._id.toString(),
        courseId,
      });
    } catch (e) {
      console.warn("Points recording error:", e.message);
    }
  } else {
    // Test Failed (< 50%) -> Next module stays locked, allow retry
    progress.status = "test_failed";
  }

  await progress.save();

  return {
    success: true,
    score: correctCount,
    totalQuestions,
    scorePercentage,
    passingScorePercentage: MIN_TEST_PASS_PERCENTAGE,
    passed,
    status: progress.status,
    attemptNumber: progress.testAttemptsCount,
    questions: gradedQuestions,
    certificate: certificate ? {
      _id: certificate._id,
      certificateNumber: certificate.certificateNumber,
      studentName: certificate.studentName,
      registerNumber: certificate.registerNumber,
      courseName: certificate.courseName,
      moduleNumber: certificate.moduleNumber,
      moduleTitle: certificate.moduleTitle,
      score: certificate.score,
      grade: certificate.grade,
      issuedAt: certificate.issuedAt,
      verificationCode: certificate.verificationCode,
    } : null,
  };
}
