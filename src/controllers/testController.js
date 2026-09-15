import { DailyTest } from "../models/DailyTest.js";
import { TestAttempt } from "../models/TestAttempt.js";
import { awardPoints } from "../services/pointsService.js";
import { updateStreakOnActivity } from "../services/streakService.js";

/**
 * @route   GET /api/tests/today
 * @desc    Get current daily test (sanitized for student - NO answers)
 * @access  Public / Protected
 */
export async function getTodayTest(req, res, next) {
  try {
    const test = await DailyTest.findOne({ isPublished: true }).sort({ createdAt: -1 });

    if (!test) {
      return res.status(404).json({ success: false, message: "No daily test available today." });
    }

    // Always sanitize student-facing tests (Never send correctAnswer or explanation)
    const isElevated = req.user && (req.user.role === "admin" || req.user.role === "teacher");
    const testData = isElevated ? test : test.toStudentSafeObject();

    let previousAttempt = null;
    if (req.user && req.user.role === "student") {
      previousAttempt = await TestAttempt.findOne({
        studentId: req.user._id,
        testId: test._id,
      }).sort({ createdAt: -1 });
    }

    res.json({
      success: true,
      test: testData,
      previousAttempt,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/tests
 * @desc    Get all daily/practice tests
 * @access  Public / Protected
 */
export async function getDailyTests(req, res, next) {
  try {
    const { category, difficulty, courseId } = req.query;
    const query = { isPublished: true };

    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (courseId) query.courseId = courseId;

    const tests = await DailyTest.find(query).sort({ day: 1, createdAt: -1 });

    const isElevated = req.user && (req.user.role === "admin" || req.user.role === "teacher");
    const sanitizedTests = tests.map((t) => (isElevated ? t : t.toStudentSafeObject()));

    res.json({
      success: true,
      tests: sanitizedTests,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/tests/:id
 * @desc    Get single test by ID
 * @access  Public / Protected
 */
export async function getTestById(req, res, next) {
  try {
    const test = await DailyTest.findById(req.params.id);
    if (!test || !test.isPublished) {
      return res.status(404).json({ success: false, message: "Test not found." });
    }

    const isElevated = req.user && (req.user.role === "admin" || req.user.role === "teacher");
    const testData = isElevated ? test : test.toStudentSafeObject();

    res.json({
      success: true,
      test: testData,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/tests/:id/submit
 * @desc    Submit test answers, evaluate strictly on backend, award points & update streak
 * @access  Protected (Student)
 */
export async function submitTest(req, res, next) {
  try {
    const testId = req.params.id;
    const studentId = req.user._id;
    const {
      answers = [],
      violations = [],
      submissionType = "manual",
      timeSpentSeconds = 0,
    } = req.body; // Array of { questionId, selectedAnswer }

    const test = await DailyTest.findById(testId);
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found." });
    }

    // Check attempt limit
    const attemptsCount = await TestAttempt.countDocuments({ studentId, testId });
    if (attemptsCount >= (test.attemptLimit || 3)) {
      return res.status(400).json({
        success: false,
        message: `Maximum attempt limit (${test.attemptLimit || 3}) reached for this test.`,
      });
    }

    // Backend Evaluation: Compare selectedAnswer against question.correctAnswer
    let score = 0;
    let totalMarks = test.questions.length;
    const userAnswers = [];

    const answerMap = new Map();
    answers.forEach((a) => answerMap.set(String(a.questionId), Number(a.selectedAnswer)));

    const questionBreakdown = test.questions.map((q) => {
      const qId = String(q._id);
      const selected = answerMap.has(qId) ? answerMap.get(qId) : null;
      const isCorrect = selected !== null && selected === q.correctAnswer;

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
        correctAnswer: q.correctAnswer, // Revealed only AFTER submission in the evaluation response
        isCorrect,
        explanation: q.explanation,
      };
    });

    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const passed = percentage >= (test.passingPercentage || 60);

    // Calculate Points
    let pointsEarned = 0;
    if (passed) {
      pointsEarned += test.pointsReward || 10;
      if (percentage === 100 && violations.length === 0) {
        pointsEarned += test.bonusPoints || 5;
      }
      await awardPoints(studentId, pointsEarned, "daily_test", `Completed daily test: ${test.title}`);
    } else {
      // Small participation reward (+2 points)
      pointsEarned = 2;
      await awardPoints(studentId, pointsEarned, "daily_test", `Participated in test: ${test.title}`);
    }

    // Update Student Streak
    const streakResult = await updateStreakOnActivity(studentId);

    // Record Test Attempt
    const attempt = await TestAttempt.create({
      studentId,
      testId,
      courseId: test.courseId || null,
      score,
      totalMarks,
      percentage,
      passed,
      pointsEarned,
      attemptNumber: attemptsCount + 1,
      userAnswers,
      violationsCount: violations.length,
      violations,
      submissionType,
      timeSpentSeconds,
    });

    res.json({
      success: true,
      message: passed ? "Congratulations! You passed the test." : "Test completed. Keep practicing to improve!",
      result: {
        attemptId: attempt._id,
        score,
        totalMarks,
        percentage,
        passed,
        pointsEarned,
        violationsCount: violations.length,
        submissionType,
        streak: streakResult,
        breakdown: questionBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/tests/:id/violation
 * @desc    Record security violation event during MCQ test
 * @access  Private (Student)
 */
export async function recordTestViolation(req, res, next) {
  try {
    const { id } = req.params;
    const { type, details = {}, currentViolationCount = 1 } = req.body;
    const studentId = req.user._id;

    const test = await DailyTest.findById(id);
    const maxViolations = test?.maxViolations || 3;

    const violation = await TestViolation.create({
      studentId,
      testType: "mcq",
      testId: id,
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

/**
 * @route   GET /api/tests/my/attempts
 * @desc    Get student's test attempt history
 * @access  Protected (Student)
 */
export async function getMyAttempts(req, res, next) {
  try {
    const attempts = await TestAttempt.find({ studentId: req.user._id })
      .populate("testId", "title category difficulty")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      attempts,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/tests
 * @desc    Create new test
 * @access  Protected (Teacher / Admin)
 */
export async function createTest(req, res, next) {
  try {
    const test = await DailyTest.create(req.body);
    res.status(201).json({ success: true, message: "Test created successfully.", test });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/tests/:id
 * @desc    Update test
 * @access  Protected (Teacher / Admin)
 */
export async function updateTest(req, res, next) {
  try {
    const test = await DailyTest.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found." });
    }
    res.json({ success: true, message: "Test updated successfully.", test });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/tests/:id
 * @desc    Delete test
 * @access  Protected (Teacher / Admin)
 */
export async function deleteTest(req, res, next) {
  try {
    const test = await DailyTest.findByIdAndDelete(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found." });
    }
    res.json({ success: true, message: "Test deleted." });
  } catch (error) {
    next(error);
  }
}
