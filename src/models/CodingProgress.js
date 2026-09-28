import mongoose from "mongoose";

const codingProgressSchema = new mongoose.Schema(
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
    done: {
      type: Boolean,
      default: false,
    },
    solvedAt: {
      type: Date,
      default: null,
    },
    bestScore: {
      type: Number,
      default: 0,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    language: {
      type: String,
      enum: ["python", "javascript", "cpp", "java", "c"],
      default: null,
    },
    lastStatus: {
      type: String,
      default: null,
    },
    lastSubmittedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

codingProgressSchema.index(
  { studentId: 1, codingTestId: 1, problemId: 1 },
  { unique: true }
);

export const CodingProgress = mongoose.model("CodingProgress", codingProgressSchema);