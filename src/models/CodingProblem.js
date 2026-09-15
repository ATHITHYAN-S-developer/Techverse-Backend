import mongoose from "mongoose";

const testCaseSchema = new mongoose.Schema({
  input: { type: String, default: "" },
  output: { type: String, default: "" },
  isHidden: { type: Boolean, default: false },
});

const codingProblemSchema = new mongoose.Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseModule",
      required: [true, "Module reference is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Problem title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Problem description is required"],
    },
    constraints: {
      type: String,
      default: "1 <= N <= 10^5",
    },
    inputFormat: {
      type: String,
      default: "First line contains integer N.",
    },
    outputFormat: {
      type: String,
      default: "Print required solution output.",
    },
    supportedLanguages: {
      type: [String],
      default: ["javascript", "python", "java", "cpp"],
    },
    starterCode: {
      type: String,
      default: "function solution(input) {\n  return input;\n}",
    },
    testCases: {
      type: [testCaseSchema],
      default: [],
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    timeLimit: {
      type: Number,
      default: 2,
    },
    memoryLimit: {
      type: Number,
      default: 256,
    },
  },
  {
    timestamps: true,
  }
);

export const CodingProblem = mongoose.model("CodingProblem", codingProblemSchema);
