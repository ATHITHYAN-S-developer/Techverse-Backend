import mongoose from "mongoose";
import { ModuleProgress } from "../models/ModuleProgress.js";
import { CourseModule } from "../models/CourseModule.js";
import { Course } from "../models/Course.js";
import { Enrollment } from "../models/Enrollment.js";
import { Certificate } from "../models/Certificate.js";
import { User } from "../models/User.js";
import { generateCertificateNumber } from "../utils/generateId.js";
import { updateStreakOnActivity } from "./streakService.js";
import { issueCertificate } from "./certificateService.js";

const SEGMENT_DURATION_SECONDS = 5; // Each discrete slice is 5 seconds
const MIN_WATCH_PERCENTAGE = 40; // 40% unique watch requirement
const MIN_TEST_PASS_PERCENTAGE = 50; // 50% passing score

/**
 * Helper to determine what is required and whether requirements are met for a module
 */
export function evaluateModuleRequirements(moduleDoc, progress) {
  const hasVideo = Boolean(
    moduleDoc.hasVideo ||
    moduleDoc.videoUrl ||
    (moduleDoc.videos && moduleDoc.videos.length > 0)
  );
  const hasCoding = Boolean(
    moduleDoc.hasCoding ||
    (moduleDoc.codingProblems && moduleDoc.codingProblems.length > 0)
  );
  const hasMCQ = Boolean(
    moduleDoc.hasMCQ ||
    (moduleDoc.mcqs && moduleDoc.mcqs.length > 0)
  );

  // Video requirement: Required if module has video AND (isVideoMandatory OR neither coding nor MCQ exists)
  const isVideoRequired = Boolean(hasVideo && (moduleDoc.isVideoMandatory || (!hasCoding && !hasMCQ)));
  const videoSatisfied = !isVideoRequired || Boolean(progress?.videoRequirementMet);

  // Coding requirement: Required if faculty enabled coding
  const isCodingRequired = hasCoding;
  const codingSatisfied = !isCodingRequired || Boolean(progress?.codingPassed);

  // MCQ requirement: Required if faculty enabled MCQ
  const isMCQRequired = hasMCQ;
  const mcqSatisfied = !isMCQRequired || Boolean(progress?.testPassed);

  const isAllCompleted = Boolean(
    progress?.status === "module_completed" ||
    (videoSatisfied && codingSatisfied && mcqSatisfied)
  );

  return {
    hasVideo,
    hasCoding,
    hasMCQ,
    isVideoRequired,
    isCodingRequired,
    isMCQRequired,
    videoSatisfied,
    codingSatisfied,
    mcqSatisfied,
    isAllCompleted,
  };
}

/**
 * Checks if the entire course has been completed by the student.
 * If completed, all limitations are removed: student can freely view any module
 * and attend any test/coding challenge at any time in that course.
 */
export async function isCourseCompletedForStudent(studentId, courseId) {
  if (!studentId || !courseId) return false;

  const enrollment = await Enrollment.findOne({ studentId, courseId });
  if (enrollment && (enrollment.status === "completed" || enrollment.progressPercentage >= 100)) {
    return true;
  }

  const modules = await CourseModule.find({ courseId, isPublished: true });
  if (modules.length === 0) return false;

  const completedProgressCount = await ModuleProgress.countDocuments({
    studentId,
    courseId,
    status: "module_completed",
  });

  if (completedProgressCount >= modules.length) {
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
 * Module N is unlocked if Module N-1 is completed (all faculty-chosen requirements satisfied).
 */
export async function isModuleUnlockedForStudent(studentId, courseId, moduleNumber) {
  if (moduleNumber <= 1) return true;

  const isCourseDone = await isCourseCompletedForStudent(studentId, courseId);
  if (isCourseDone) return true;

  // 1. Find previous module doc in this course
  const prevModule = await CourseModule.findOne({ courseId, moduleNumber: moduleNumber - 1 });
  if (prevModule) {
    const prevProgress = await ModuleProgress.findOne({
      studentId,
      moduleId: prevModule._id,
    });

    if (prevProgress) {
      const evalPrev = evaluateModuleRequirements(prevModule, prevProgress);
      if (evalPrev.isAllCompleted) return true;
    }

    const enrollment = await Enrollment.findOne({
      studentId,
      courseId,
      completedModules: prevModule._id,
    });
    if (enrollment) return true;
  }

  // 2. Check if previous module (moduleNumber - 1) has a progress record by moduleNumber
  const prevProgressByNum = await ModuleProgress.findOne({
    studentId,
    courseId,
    moduleNumber: moduleNumber - 1,
  });

  if (prevProgressByNum) {
    return Boolean(
      prevProgressByNum.status === "module_completed" ||
      prevProgressByNum.testPassed ||
      prevProgressByNum.codingPassed
    );
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

  const hasVideo = Boolean(
    moduleDoc.hasVideo ||
    moduleDoc.videoUrl ||
    (moduleDoc.videos && moduleDoc.videos.length > 0)
  );

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
      watchPercentage: !hasVideo ? 100 : 0,
      videoRequirementMet: isCourseDone || !hasVideo || !moduleDoc.isVideoMandatory,
      testUnlocked: isCourseDone || !hasVideo || !moduleDoc.isVideoMandatory,
      testPassed: false,
      codingPassed: false,
    });
  } else {
    if (isCourseDone) {
      progress.videoRequirementMet = true;
      progress.testUnlocked = true;
    } else if (!hasVideo || !moduleDoc.isVideoMandatory) {
      progress.videoRequirementMet = true;
      progress.testUnlocked = true;
    }
    if (isUnlocked && progress.status === "video_locked") {
      progress.status = "video_in_progress";
      await progress.save();
    }
  }

  return { progress, moduleDoc, isUnlocked, isCourseDone };
}

/**
 * Finalize module completion if all requirements selected by the faculty are fulfilled:
 * - Video watched (if video is enabled and mandatory)
 * - Coding passed (if coding is enabled)
 * - MCQ test passed (if MCQ is enabled)
 */
export async function finalizeModuleCompletionIfEligible({
  studentId,
  courseId,
  moduleDoc,
  progress,
  scorePercentage = 100,
}) {
  const reqs = evaluateModuleRequirements(moduleDoc, progress);

  if (!reqs.isAllCompleted) {
    return { isCompleted: false, progress };
  }

  // Mark module fully completed
  progress.status = "module_completed";
  progress.completedAt = progress.completedAt || new Date();

  // Create Appreciation Certificate if not already present
  let certificate = null;
  let existingCert = await Certificate.findOne({
    studentId,
    courseId,
    moduleId: moduleDoc._id,
    type: "module_appreciation",
  });

  const course = await Course.findById(courseId);
  const studentUser = await User.findById(studentId);

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
  await progress.save();

  // Update Enrollment
  const enrollment = await Enrollment.findOneAndUpdate(
    { studentId, courseId },
    {
      $addToSet: { completedModules: moduleDoc._id },
      $set: { lastActivityAt: new Date() },
    },
    { upsert: true, new: true }
  );

  const totalModules = await CourseModule.countDocuments({ courseId, isPublished: true });
  if (totalModules > 0) {
    enrollment.progressPercentage = Math.min(
      Math.round((enrollment.completedModules.length / totalModules) * 100),
      100
    );
  }

  let courseCertificate = null;
  // If all modules are finished -> complete the course & mint certificate if enabled
  if (totalModules > 0 && enrollment.progressPercentage >= 100 && enrollment.status !== "completed") {
    enrollment.status = "completed";
    enrollment.completedAt = enrollment.completedAt || new Date();

    if (course?.certificateEnabled !== false) {
      try {
        const certResult = await issueCertificate({
          studentId,
          courseId,
          score: scorePercentage,
        });
        courseCertificate = certResult.certificate || null;
      } catch (certErr) {
        console.warn("Course completion certificate issue notice:", certErr.message);
      }
    }
  }

  await enrollment.save();

  try {
    await updateStreakOnActivity(studentId);
  } catch (e) {
    console.warn("Streak update error:", e.message);
  }

  return {
    isCompleted: true,
    progress,
    certificate,
    courseCertificate,
    enrollment,
  };
}

/**
 * Record genuine video watch progress using discretized 5-second segments.
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

  if (playbackRate < 0.25 || playbackRate > 3) {
    return {
      success: false,
      message: "Abnormal playback speed ignored.",
      watchPercentage: progress.watchPercentage,
      videoRequirementMet: progress.videoRequirementMet,
      testUnlocked: progress.testUnlocked,
    };
  }

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

  if (duration > 0 && (progress.videoDurationSeconds === 0 || Math.abs(progress.videoDurationSeconds - duration) > 10)) {
    progress.videoDurationSeconds = Math.round(duration);
  }

  const effectiveDuration = progress.videoDurationSeconds || (duration > 0 ? Math.round(duration) : 600);
  const maxPossibleSegment = Math.ceil(effectiveDuration / SEGMENT_DURATION_SECONDS) + 2;

  const currentSegmentsSet = new Set(progress.watchedSegments || []);
  incomingSegments.forEach((seg) => {
    if (seg >= 0 && seg <= maxPossibleSegment) {
      currentSegmentsSet.add(seg);
    }
  });

  const updatedSegments = Array.from(currentSegmentsSet).sort((a, b) => a - b);
  progress.watchedSegments = updatedSegments;

  const uniqueSeconds = Math.min(effectiveDuration, updatedSegments.length * SEGMENT_DURATION_SECONDS);
  progress.uniqueWatchedSeconds = uniqueSeconds;

  const percentage = effectiveDuration > 0
    ? Math.min(100, Math.round((uniqueSeconds / effectiveDuration) * 100))
    : 0;

  progress.watchPercentage = percentage;
  progress.lastWatchedAt = new Date();

  // 40% watch threshold
  if (percentage >= MIN_WATCH_PERCENTAGE) {
    progress.videoRequirementMet = true;
    progress.testUnlocked = true;
    if (progress.status === "video_in_progress" || progress.status === "video_locked") {
      progress.status = "test_unlocked";
    }
  }

  await progress.save();

  // If this module ONLY has video (no coding and no MCQ), reaching watch threshold completes the module!
  const completionResult = await finalizeModuleCompletionIfEligible({
    studentId,
    courseId,
    moduleDoc,
    progress,
    scorePercentage: 100,
  });

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
    isCompleted: Boolean(completionResult?.isCompleted),
    certificate: completionResult?.certificate || null,
  };
}

/**
 * Record coding challenge progress when a student runs/submits their code
 */
export async function recordModuleCodingProgress(studentId, courseId, moduleId, payload = {}) {
  const { progress, moduleDoc, isUnlocked } = await getOrCreateModuleProgress(studentId, courseId, moduleId);

  progress.codingAttemptsCount = (progress.codingAttemptsCount || 0) + 1;

  if (payload.allPassed) {
    progress.codingPassed = true;
    progress.codingCompletedAt = new Date();
  }

  await progress.save();

  let completionResult = { isCompleted: false };
  if (progress.codingPassed) {
    completionResult = await finalizeModuleCompletionIfEligible({
      studentId,
      courseId,
      moduleDoc,
      progress,
      scorePercentage: 100,
    });
  }

  return {
    success: true,
    codingPassed: progress.codingPassed,
    isCompleted: Boolean(completionResult.isCompleted || progress.status === "module_completed"),
    status: progress.status,
    certificate: completionResult.certificate || null,
    courseCertificate: completionResult.courseCertificate || null,
  };
}

/**
 * Grade module test submitted by student.
 * If score >= 50% and coding (if enabled) is also passed, completes module and issues appreciation certificate.
 */
export async function submitModuleTest(studentId, courseId, moduleId, payload) {
  const { progress, moduleDoc, isUnlocked, isCourseDone } = await getOrCreateModuleProgress(studentId, courseId, moduleId);

  if (!isUnlocked && !isCourseDone) {
    const err = new Error(`Module ${moduleDoc.moduleNumber} is locked. Complete previous modules first.`);
    err.status = 403;
    throw err;
  }

  // Verify video watch requirement only if module has video AND video is mandatory
  const isVideoMandatory = Boolean(moduleDoc.hasVideo && moduleDoc.isVideoMandatory);
  if (
    isVideoMandatory &&
    !isCourseDone &&
    !progress.testPassed &&
    (!progress.videoRequirementMet || progress.watchPercentage < MIN_WATCH_PERCENTAGE)
  ) {
    const err = new Error(
      `Test Locked: You must watch at least ${MIN_WATCH_PERCENTAGE}% of the tutorial video before taking the test (Current: ${progress.watchPercentage}%).`
    );
    err.status = 403;
    err.code = "VIDEO_WATCH_REQUIREMENT_NOT_MET";
    throw err;
  }

  const userAnswersRaw = payload.answers || payload.userAnswers || {};
  const mcqs = moduleDoc.mcqs || [];

  if (mcqs.length === 0) {
    throw new Error("This module does not contain test questions.");
  }

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
        isCorrect =
          q.options[Number(userSelected)]?.trim().toLowerCase() === correctText.trim().toLowerCase() ||
          userSelected.trim().toLowerCase() === correctText.trim().toLowerCase();
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

  const course = await Course.findById(courseId);
  const requiredPassPercentage =
    Number(course?.passingPercentage) || Number(course?.passingScore) || MIN_TEST_PASS_PERCENTAGE;

  const totalQuestions = mcqs.length;
  const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
  const passed = scorePercentage >= requiredPassPercentage;

  progress.testAttemptsCount = (progress.testAttemptsCount || 0) + 1;
  progress.testScore = scorePercentage;
  progress.testPassed = passed;
  progress.testCompletedAt = new Date();

  let completionResult = { isCompleted: false };

  if (passed) {
    completionResult = await finalizeModuleCompletionIfEligible({
      studentId,
      courseId,
      moduleDoc,
      progress,
      scorePercentage,
    });

    if (!completionResult.isCompleted) {
      // Test passed, but other required components (e.g. coding) are still pending
      progress.status = "test_passed";
    }
  } else {
    progress.status = "test_failed";
  }

  await progress.save();

  return {
    success: true,
    score: correctCount,
    totalQuestions,
    scorePercentage,
    passingScorePercentage: requiredPassPercentage,
    passed,
    isCompleted: Boolean(completionResult.isCompleted || progress.status === "module_completed"),
    status: progress.status,
    attemptNumber: progress.testAttemptsCount,
    questions: gradedQuestions,
    courseCertificate: completionResult.courseCertificate
      ? {
          _id: completionResult.courseCertificate._id,
          certificateNumber: completionResult.courseCertificate.certificateNumber,
          studentName: completionResult.courseCertificate.studentName,
          registerNumber: completionResult.courseCertificate.registerNumber,
          courseName: completionResult.courseCertificate.courseName,
          score: completionResult.courseCertificate.score,
          grade: completionResult.courseCertificate.grade,
          issuedAt: completionResult.courseCertificate.issuedAt,
          verificationCode: completionResult.courseCertificate.verificationCode,
        }
      : null,
    certificate: completionResult.certificate
      ? {
          _id: completionResult.certificate._id,
          certificateNumber: completionResult.certificate.certificateNumber,
          studentName: completionResult.certificate.studentName,
          registerNumber: completionResult.certificate.registerNumber,
          courseName: completionResult.certificate.courseName,
          moduleNumber: completionResult.certificate.moduleNumber,
          moduleTitle: completionResult.certificate.moduleTitle,
          score: completionResult.certificate.score,
          grade: completionResult.certificate.grade,
          issuedAt: completionResult.certificate.issuedAt,
          verificationCode: completionResult.certificate.verificationCode,
        }
      : null,
  };
}

/**
 * Get comprehensive progression map for all modules in a course for a student
 */
export async function getCourseProgressionMap(studentId, courseId) {
  const course = (await Course.findById(courseId)) || (await Course.findOne({ slug: courseId }));
  if (!course) throw new Error("Course not found.");

  const isCourseDone = await isCourseCompletedForStudent(studentId, course._id);
  const modules = await CourseModule.find({ courseId: course._id, isPublished: true }).sort({
    moduleNumber: 1,
    order: 1,
  });
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

    const hasVideo = Boolean(m.hasVideo || m.videoUrl || (m.videos && m.videos.length > 0));
    const hasCoding = Boolean(m.hasCoding || (m.codingProblems && m.codingProblems.length > 0));
    const hasMCQ = Boolean(m.hasMCQ || (m.mcqs && m.mcqs.length > 0));

    const reqVideo = hasVideo && (m.isVideoMandatory || (!hasCoding && !hasMCQ));
    const reqCoding = hasCoding;
    const reqMCQ = hasMCQ;

    const videoDone = isCourseDone || !reqVideo || Boolean(p?.videoRequirementMet);
    const codingDone = isCourseDone || !reqCoding || Boolean(p?.codingPassed);
    const mcqDone = isCourseDone || !reqMCQ || Boolean(p?.testPassed);

    const isModuleFinished = Boolean(
      p?.status === "module_completed" ||
      (videoDone && codingDone && mcqDone)
    );

    const isUnlocked = isCourseDone || previousModuleCompleted;
    previousModuleCompleted = isModuleFinished;

    let computedStatus = "video_locked";
    if (!isUnlocked) {
      computedStatus = "video_locked";
    } else if (isModuleFinished) {
      computedStatus = cert ? "module_completed" : "test_passed";
    } else if (p?.testPassed) {
      computedStatus = "test_passed";
    } else if (p?.codingPassed) {
      computedStatus = "coding_passed";
    } else if (videoDone) {
      computedStatus = p?.testScore !== null && p?.testScore !== undefined ? "test_failed" : "test_unlocked";
    } else if (isUnlocked) {
      computedStatus = "video_in_progress";
    }

    const testUnlocked = isUnlocked && (!reqVideo || videoDone);

    return {
      moduleId: m._id,
      moduleNumber: m.moduleNumber || index + 1,
      title: m.title,
      description: m.description,
      videoUrl: m.videoUrl,
      hasVideo,
      hasCoding,
      hasMCQ,
      isVideoMandatory: Boolean(m.isVideoMandatory),
      isUnlocked,
      status: p?.status === "module_completed" ? "module_completed" : computedStatus,
      isCompleted: isModuleFinished,
      watchPercentage: p?.watchPercentage || (isCourseDone ? 100 : 0),
      uniqueWatchedSeconds: p?.uniqueWatchedSeconds || 0,
      videoDurationSeconds: p?.videoDurationSeconds || 0,
      videoRequirementMet: videoDone,
      testUnlocked: testUnlocked,
      testScore: p?.testScore ?? null,
      testPassed: Boolean(p?.testPassed),
      codingPassed: Boolean(p?.codingPassed),
      testAttemptsCount: p?.testAttemptsCount || 0,
      codingAttemptsCount: p?.codingAttemptsCount || 0,
      certificate: cert
        ? {
            id: cert._id,
            certificateNumber: cert.certificateNumber,
            score: cert.score,
            issuedAt: cert.issuedAt,
            verificationCode: cert.verificationCode,
          }
        : null,
    };
  });

  const completedCount = moduleProgression.filter((m) => m.isCompleted).length;
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
