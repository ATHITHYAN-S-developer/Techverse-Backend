import mongoose from "mongoose";

const testResultSchema = new mongoose.Schema(
  {
    testCaseNumber: Number,
    passed: Boolean,
    input: String,
    expectedOutput: String,
    actualOutput: String,
    errorMessage: String,
    isHidden: Boolean,
    executionTime: Number, // in ms
  },
  { _id: false }
);

const codingSubmissionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    codingTestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CodingTest",
      required: true,
      index: true,
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    language: {
      type: String,
      required: true,
      enum: ["python", "javascript", "cpp", "java", "c"],
    },
    sourceCode: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "Accepted",
        "Wrong Answer",
        "Time Limit Exceeded",
        "Compilation Error",
        "Runtime Error",
        "Internal Error",
      ],
      default: "Wrong Answer",
    },
    passedCases: {
      type: Number,
      default: 0,
    },
    totalCases: {
      type: Number,
      default: 0,
    },
    score: {
      type: Number,
      default: 0,
    },
    executionTime: {
      type: Number, // in seconds or ms
      default: 0,
    },
    memory: {
      type: Number, // in MB
      default: 0,
    },
    testResults: [testResultSchema],
    violationsCount: {
      type: Number,
      default: 0,
    },
    violations: [
      {
        type: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        details: String,
      },
    ],
    submissionType: {
      type: String,
      enum: ["manual", "auto_timer", "auto_violation"],
      default: "manual",
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const CodingSubmission = mongoose.model("CodingSubmission", codingSubmissionSchema);
