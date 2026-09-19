import mongoose from "mongoose";

const moduleProgressSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student reference is required"],
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"],
      index: true,
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseModule",
      required: [true, "Module reference is required"],
      index: true,
    },
    moduleNumber: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "video_locked",
        "video_in_progress",
        "video_completed",
        "test_unlocked",
        "test_in_progress",
        "test_failed",
        "test_passed",
        "certificate_generated",
        "module_completed",
      ],
      default: "video_in_progress",
      index: true,
    },
    // Array of unique 5-second interval indices watched (e.g. index 0 is 0-5s, 1 is 5-10s)
    watchedSegments: {
      type: [Number],
      default: [],
    },
    videoDurationSeconds: {
      type: Number,
      default: 0,
    },
    uniqueWatchedSeconds: {
      type: Number,
      default: 0,
    },
    watchPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    videoRequirementMet: {
      type: Boolean,
      default: false,
    },
    testUnlocked: {
      type: Boolean,
      default: false,
    },
    testScore: {
      type: Number,
      default: null,
    },
    testPassed: {
      type: Boolean,
      default: false,
    },
    testAttemptsCount: {
      type: Number,
      default: 0,
    },
    userAnswers: [
      {
        questionIndex: Number,
        questionId: mongoose.Schema.Types.ObjectId,
        selectedAnswer: Number,
        isCorrect: Boolean,
      },
    ],
    certificateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Certificate",
      default: null,
    },
    lastWatchedAt: {
      type: Date,
      default: Date.now,
    },
    testCompletedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index so a student has exactly one progress record per module
moduleProgressSchema.index({ studentId: 1, moduleId: 1 }, { unique: true });
moduleProgressSchema.index({ studentId: 1, courseId: 1, moduleNumber: 1 });

export const ModuleProgress = mongoose.model("ModuleProgress", moduleProgressSchema);
