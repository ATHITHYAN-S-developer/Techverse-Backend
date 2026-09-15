import { CodingTest } from "../models/CodingTest.js";
import { CodingSubmission } from "../models/CodingSubmission.js";
import { TestViolation } from "../models/TestViolation.js";
import { runCodeAgainstTestCases } from "../services/codeRunnerService.js";
import { awardPoints } from "../services/pointsService.js";
import { updateStreak } from "../services/streakService.js";
import { logAuditEvent } from "../services/auditService.js";

/**
 * @route   GET /api/coding
 * @desc    Get all published coding tests
 * @access  Public / Authenticated
 */
export async function getCodingTests(req, res, next) {
  try {
    const tests = await CodingTest.find({ isPublished: true })
      .select("-problems.hiddenTestCases")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tests.length,
      codingTests: tests,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/coding/:id
 * @desc    Get single coding test with hidden test cases stripped
 * @access  Public / Authenticated
 */
export async function getCodingTestById(req, res, next) {
  try {
    const { id } = req.params;
    let test = await CodingTest.findById(id);

    if (!test) {
      test = await CodingTest.findOne({ slug: id });
    }

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Coding test not found.",
        code: "TEST_NOT_FOUND",
      });
    }

    // Strictly strip hidden test cases
    const safeTest = test.toStudentSafeObject();

    res.json({
      success: true,
      codingTest: safeTest,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/coding/:id/run
 * @desc    Run code against public test cases only (Fast Debugging)
 * @access  Private (Student)
 */
export async function runCode(req, res, next) {
  try {
    const { id } = req.params;
    const { problemId, language = "python", sourceCode } = req.body;

    if (!sourceCode) {
      return res.status(400).json({
        success: false,
        message: "Source code is required.",
        code: "SOURCE_CODE_REQUIRED",
      });
    }

    const test = await CodingTest.findById(id);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Coding test not found.",
        code: "TEST_NOT_FOUND",
      });
    }

    const problem = test.problems.id(problemId) || test.problems[0];
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found in this test.",
        code: "PROBLEM_NOT_FOUND",
      });
    }

    // Run against public test cases only
    const publicCases = problem.publicTestCases.map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isHidden: false,
    }));

    const result = await runCodeAgainstTestCases(language, sourceCode, publicCases);

    res.json({
      success: true,
      isPublicRun: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/coding/:id/submit
 * @desc    Submit solution and evaluate against ALL test cases (Public + Hidden)
 * @access  Private (Student)
 */
export async function submitCode(req, res, next) {
  try {
    const { id } = req.params;
    const {
      problemId,
      language = "python",
      sourceCode,
      violations = [],
      submissionType = "manual",
    } = req.body;

    const studentId = req.user._id;

    if (!sourceCode) {
      return res.status(400).json({
        success: false,
        message: "Source code is required for submission.",
        code: "SOURCE_CODE_REQUIRED",
      });
    }

    const test = await CodingTest.findById(id);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Coding test not found.",
        code: "TEST_NOT_FOUND",
      });
    }

    const problem = test.problems.id(problemId) || test.problems[0];
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found.",
        code: "PROBLEM_NOT_FOUND",
      });
    }

    // Combine public and hidden test cases for full evaluation
    const allCases = [
      ...problem.publicTestCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: false,
      })),
      ...problem.hiddenTestCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: true,
      })),
    ];

    const result = await runCodeAgainstTestCases(language, sourceCode, allCases);

    const totalCases = allCases.length;
    const passedCases = result.passedCases || 0;
    const scorePercentage = totalCases > 0 ? Math.round((passedCases / totalCases) * 100) : 0;
    const isAccepted = result.status === "Accepted";

    let pointsAwarded = 0;
    if (isAccepted) {
      pointsAwarded = test.pointsReward || 30;
      if (violations.length === 0) {
        pointsAwarded += test.bonusPoints || 10; // Bonus for clean zero-violation run
      }
      await awardPoints(studentId, pointsAwarded, `Solved Coding Problem: ${problem.title}`);
      await updateStreak(studentId);
    }

    // Create submission record
    const submission = await CodingSubmission.create({
      studentId,
      codingTestId: test._id,
      problemId: problem._id,
      language,
      sourceCode,
      status: result.status,
      passedCases,
      totalCases,
      score: scorePercentage,
      executionTime: result.executionTime,
      memory: result.memory,
      testResults: result.testResults,
      violationsCount: violations.length,
      violations,
      submissionType,
    });

    await logAuditEvent({
      userId: studentId,
      userRole: "student",
      action: "CODING_SUBMISSION",
      resourceType: "CodingSubmission",
      resourceId: submission._id,
      details: {
        testId: test._id,
        problemTitle: problem.title,
        status: result.status,
        score: scorePercentage,
        submissionType,
        violationsCount: violations.length,
      },
    });

    res.json({
      success: true,
      submissionId: submission._id,
      status: result.status,
      passedCases,
      totalCases,
      score: scorePercentage,
      pointsAwarded,
      isAccepted,
      executionTime: result.executionTime,
      memory: result.memory,
      testResults: result.testResults,
      violationsCount: violations.length,
      submissionType,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/coding/:id/violation
 * @desc    Record security violation event during coding exam
 * @access  Private (Student)
 */
export async function recordCodingViolation(req, res, next) {
  try {
    const { id } = req.params;
    const { type, details = {}, currentViolationCount = 1 } = req.body;
    const studentId = req.user._id;

    const test = await CodingTest.findById(id);
    const maxViolations = test?.settings?.maxViolations || 3;

    const violation = await TestViolation.create({
      studentId,
      testType: "coding",
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
        ? `Maximum violation threshold (${maxViolations}) reached. Test will now be submitted automatically.`
        : `Security violation recorded (${type}). Violation ${currentViolationCount} of ${maxViolations}.`,
    });
  } catch (error) {
    next(error);
  }
}
