import { CourseAssessment } from "../models/CourseAssessment.js";
import { TestAttempt } from "../models/TestAttempt.js";
import { TestViolation } from "../models/TestViolation.js";
import { Course } from "../models/Course.js";
import { CourseModule } from "../models/CourseModule.js";
import { ModuleProgress } from "../models/ModuleProgress.js";
import { updateStreakOnActivity } from "../services/streakService.js";

export async function getCourseAssessmentForCourse(req, res, next) {
  try {
    const course = await Course.findOne({ slug: req.params.courseSlug }).select("_id");
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    const assessment = await CourseAssessment.findOne({ courseId: course._id, isPublished: true });
    res.json({
      success: true,
      test: assessment ? assessment.toStudentSafeObject() : null,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/course-assessments/:courseSlug/:assessmentId
 * @desc    Get a course-final assessment by course and ID
 * @access  Protected (Student)
 */
export async function getTestById(req, res, next) {
  try {
    const course = await Course.findOne({ slug: req.params.courseSlug }).select("_id slug");
    const test = await CourseAssessment.findById(req.params.assessmentId);
    if (!course || !test || !test.isPublished || String(test.courseId) !== String(course._id)) {
      return res.status(404).json({ success: false, message: "Course assessment not found." });
    }

    const testData = test.toStudentSafeObject();

    let isLocked = false;
    let lockReason = "";
    let totalModules = 0;
    let completedModulesCount = 0;
    let courseSlug = null;

    if (req.user?.role === "student") {
      const course = await Course.findById(test.courseId);
      if (course) {
        courseSlug = course.slug;
        const modules = await CourseModule.find({ courseId: course._id, isPublished: true });
        totalModules = modules.length;
        completedModulesCount = await ModuleProgress.countDocuments({
          studentId: req.user._id,
          courseId: course._id,
          testPassed: true,
        });

        if (totalModules > 0 && completedModulesCount < totalModules) {
          isLocked = true;
          lockReason = `You must complete and pass all ${totalModules} module tests in ${course.title} (${completedModulesCount}/${totalModules} completed) before taking the final course assessment.`;
        }
      }
    }

    res.json({
      success: true,
      test: {
        ...testData,
        isLocked,
        lockReason,
        totalModules,
        completedModulesCount,
        courseSlug,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/course-assessments/:courseSlug/:assessmentId/submit
 * @desc    Submit a course-final assessment, evaluate on the backend, award points & update streak
 * @access  Protected (Student)
 */
export async function submitTest(req, res, next) {
  try {
    const testId = req.params.assessmentId;
    const studentId = req.user._id;

    const {
      answers = [],
      violations = [],
      submissionType = "manual",
      timeSpentSeconds = 0,
    } = req.body;

    const course = await Course.findOne({ slug: req.params.courseSlug }).select("_id");
    const test = await CourseAssessment.findById(testId);
    if (!course || !test || String(test.courseId) !== String(course._id)) {
      return res.status(404).json({ success: false, message: "Course assessment not found." });
    }

    // Gate final course assessments: Must complete all module tests first
    if (test.courseId && req.user && req.user.role === "student") {
      const modules = await CourseModule.find({ courseId: test.courseId, isPublished: true });
      const passedCount = await ModuleProgress.countDocuments({
        studentId: req.user._id,
        courseId: test.courseId,
        testPassed: true,
      });

      if (modules.length > 0 && passedCount < modules.length) {
        return res.status(403).json({
          success: false,
          code: "FINAL_ASSESSMENT_LOCKED",
          message: `Final Assessment Locked: You must pass all ${modules.length} module tests in the course before submitting the final assessment (${passedCount}/${modules.length} completed).`,
        });
      }
    }

    let attemptsCount = 0;
    if (studentId) {
      attemptsCount = await TestAttempt.countDocuments({ studentId, testId });
    }

    // Backend Evaluation: Compare selectedAnswer against question.correctAnswer
    let score = 0;
    let totalMarks = test.questions.length;
    const userAnswers = [];

    const answerMap = new Map();
    answers.forEach((a) => {
      answerMap.set(String(a.questionId), Number(a.selectedAnswer));
    });

    const questionBreakdown = test.questions.map((q, idx) => {
      const qId = String(q._id || q.id);
      let selected = null;
      if (answerMap.has(qId)) {
        selected = answerMap.get(qId);
      } else if (answerMap.has(String(idx))) {
        selected = answerMap.get(String(idx));
      }

      let isCorrect = false;
      if (selected !== null && selected !== undefined && !isNaN(selected)) {
        if (typeof q.correctAnswer === "number") {
          isCorrect = Number(selected) === Number(q.correctAnswer);
        } else if (typeof q.correctAnswer === "string") {
          if (!isNaN(q.correctAnswer)) {
            isCorrect = Number(selected) === Number(q.correctAnswer);
          } else {
            isCorrect = q.options?.[selected]?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
          }
        }
      }

      if (isCorrect) {
        score += q.points || 1;
      }

      userAnswers.push({
        questionId: q._id,
        selectedAnswer: selected,
        isCorrect,
      });

      return {
        _id: q._id,
        question: q.question,
        options: q.options,
        selectedAnswer: selected,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const passed = percentage >= (test.passingPercentage || 60);

    if (studentId) {
      await updateStreakOnActivity(studentId);
      await TestAttempt.create({
        studentId,
        testId,
        courseId: test.courseId || null,
        score,
        totalMarks,
        percentage,
        passed,
        attemptNumber: attemptsCount + 1,
        userAnswers,
        violationsCount: violations.length,
        violations,
        submissionType,
        timeSpentSeconds,
      });
    }

    res.json({
      success: true,
      message: passed ? "Congratulations! You passed the test." : "Test completed. Keep practicing to improve!",
      result: {
        score,
        totalMarks,
        percentage,
        passed,
        violationsCount: violations.length,
        submissionType,
        breakdown: questionBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/course-assessments/:courseSlug/:assessmentId/violation
 * @desc    Record security violation during a course-final assessment
 * @access  Private (Student)
 */
export async function recordTestViolation(req, res, next) {
  try {
    const { courseSlug, assessmentId } = req.params;
    const { type, details = {}, currentViolationCount = 1 } = req.body;
    const studentId = req.user._id;

    const course = await Course.findOne({ slug: courseSlug }).select("_id");
    const test = await CourseAssessment.findById(assessmentId);
    if (!course || !test || String(test.courseId) !== String(course._id)) {
      return res.status(404).json({ success: false, message: "Course assessment not found." });
    }
    const maxViolations = test?.maxViolations || 3;

    const violation = await TestViolation.create({
      studentId,
      testType: "mcq",
      testId: assessmentId,
      type,
      details: typeof details === "string" ? details : JSON.stringify(details),
      metadata: details,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || "",
    });

    const shouldAutoSubmit = currentViolationCount >= maxViolations;

    res.json({
      success: true,
      violationId: violation._id,
      currentViolationCount,
      maxViolations,
      shouldAutoSubmit,
      warningMessage: shouldAutoSubmit
        ? `Maximum violation limit (${maxViolations}) reached. Test will now be submitted automatically.`
        : `Security violation recorded (${type}). Violation ${currentViolationCount} of ${maxViolations}.`,
    });
  } catch (error) {
    next(error);
  }
}

