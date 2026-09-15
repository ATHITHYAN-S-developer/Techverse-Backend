import mongoose from "mongoose";

const testViolationSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    type: {
      type: String,
      enum: [
        "TAB_SWITCH",
        "FULLSCREEN_EXIT",
        "WINDOW_BLUR",
        "COPY_ATTEMPT",
        "PASTE_ATTEMPT",
        "CUT_ATTEMPT",
        "CONTEXT_MENU",
        "DEVTOOLS_OPEN",
      ],
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    details: {
      type: String,
      default: "",
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

testViolationSchema.index({ testId: 1, studentId: 1, type: 1 });

export const TestViolation = mongoose.model("TestViolation", testViolationSchema);
