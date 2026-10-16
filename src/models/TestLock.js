import mongoose from "mongoose";

/**
 * A TestLock represents a temporary lock placed on a specific test for a
 * specific student. It is created when a proctored test is auto-submitted
 * after the student reaches the maximum number of security violations.
 *
 * The student cannot retake the test until `unlockAt` has passed.
 */
const testLockSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    testType: {
      type: String,
      enum: ["mcq", "coding"],
      default: "mcq",
      index: true,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      index: true,
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseModule",
      default: null,
    },
    reason: {
      type: String,
      default: "",
    },
    violationsCount: {
      type: Number,
      default: 0,
    },
    lockHours: {
      type: Number,
      default: 0,
    },
    lockedAt: {
      type: Date,
      default: Date.now,
    },
    unlockAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

testLockSchema.index({ studentId: 1, testId: 1, unlockAt: -1 });

export const TestLock = mongoose.model("TestLock", testLockSchema);
