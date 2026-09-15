import mongoose from "mongoose";

const testAttemptSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyTest",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
    score: {
      type: Number,
      required: true,
    },
    totalMarks: {
      type: Number,
      required: true,
    },
    percentage: {
      type: Number,
      required: true,
    },
    passed: {
      type: Boolean,
      required: true,
    },
    pointsEarned: {
      type: Number,
      default: 0,
    },
    attemptNumber: {
      type: Number,
      default: 1,
    },
    userAnswers: [
      {
        questionId: mongoose.Schema.Types.ObjectId,
        selectedAnswer: Number,
        isCorrect: Boolean,
      },
    ],
    violationsCount: {
      type: Number,
      default: 0,
    },
    violations: [
      {
        type: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        details: {
          type: String,
          default: "",
        },
      },
    ],
    submissionType: {
      type: String,
      enum: ["manual", "auto_timer", "auto_violation"],
      default: "manual",
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
    },
    attemptedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const TestAttempt = mongoose.model("TestAttempt", testAttemptSchema);
