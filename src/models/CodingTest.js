import mongoose from "mongoose";

const testCaseSchema = new mongoose.Schema(
  {
    input: {
      type: String,
      default: "",
    },
    expectedOutput: {
      type: String,
      required: true,
    },
    explanation: {
      type: String,
      default: "",
    },
  },
  { _id: true }
);

const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Problem title is required"],
      trim: true,
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Problem description is required"],
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    tags: [String],
    inputFormat: {
      type: String,
      default: "",
    },
    outputFormat: {
      type: String,
      default: "",
    },
    constraints: [String],
    sampleInput: {
      type: String,
      default: "",
    },
    sampleOutput: {
      type: String,
      default: "",
    },
    starterCode: {
      python: { type: String, default: "" },
      javascript: { type: String, default: "" },
      cpp: { type: String, default: "" },
      java: { type: String, default: "" },
      c: { type: String, default: "" },
    },
    // Public test cases are sent to the client for debugging/testing
    publicTestCases: [testCaseSchema],
    // Hidden test cases are kept strictly on the server to prevent cheating
    hiddenTestCases: [testCaseSchema],
    points: {
      type: Number,
      default: 20,
    },
  },
  { _id: true }
);

const codingTestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Coding test title is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "Placement",
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    timeLimit: {
      type: Number, // in minutes
      default: 45,
    },
    memoryLimit: {
      type: Number, // in MB
      default: 256,
    },
    languages: {
      type: [String],
      default: ["python", "javascript", "cpp", "java", "c"],
    },
    problems: [problemSchema],
    settings: {
      fullscreenRequired: { type: Boolean, default: true },
      antiCopy: { type: Boolean, default: true },
      antiPaste: { type: Boolean, default: true },
      maxViolations: { type: Number, default: 3 },
      autoSubmitOnViolation: { type: Boolean, default: true },
    },
    pointsReward: {
      type: Number,
      default: 50,
    },
    bonusPoints: {
      type: Number,
      default: 25,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Strips hidden test cases before sending the test to the student browser.
 * This guarantees students cannot inspect API payloads in DevTools.
 */
codingTestSchema.methods.toStudentSafeObject = function () {
  const obj = this.toObject ? this.toObject() : { ...this };
  if (Array.isArray(obj.problems)) {
    obj.problems = obj.problems.map((p) => {
      const sanitized = { ...p };
      delete sanitized.hiddenTestCases;
      return sanitized;
    });
  }
  return obj;
};

export const CodingTest = mongoose.model("CodingTest", codingTestSchema);
