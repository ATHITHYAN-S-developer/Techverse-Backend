import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    options: [
      {
        type: String,
        required: true,
      },
    ],
    points: {
      type: Number,
      default: 1,
    },
    correctAnswer: {
      type: Number, // 0-based index corresponding to options array
      required: true,
    },
    explanation: {
      type: String,
      default: "",
    },
  },
  { _id: true }
);

const dailyTestSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      index: true,
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseModule",
    },
    day: {
      type: Number,
      default: 1,
    },
    title: {
      type: String,
      required: [true, "Test title is required"],
      trim: true,
    },
    category: {
      type: String,
      default: "Programming",
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    questions: [questionSchema],
    passingPercentage: {
      type: Number,
      default: 60,
    },
    pointsReward: {
      type: Number,
      default: 10,
    },
    bonusPoints: {
      type: Number,
      default: 5,
    },
    durationMinutes: {
      type: Number,
      default: 10,
    },
    timeLimitSeconds: {
      type: Number,
      default: 600, // 10 minutes
    },
    maxViolations: {
      type: Number,
      default: 3,
    },
    fullscreenRequired: {
      type: Boolean,
      default: true,
    },
    antiCopy: {
      type: Boolean,
      default: true,
    },
    antiPaste: {
      type: Boolean,
      default: true,
    },
    autoSubmitOnViolation: {
      type: Boolean,
      default: true,
    },
    attemptLimit: {
      type: Number,
      default: 3,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Helper method to sanitize test before sending to students
dailyTestSchema.methods.toStudentSafeObject = function () {
  const obj = this.toObject ? this.toObject() : { ...this };
  if (Array.isArray(obj.questions)) {
    obj.questions = obj.questions.map((q) => {
      const sanitized = { ...q };
      delete sanitized.correctAnswer;
      delete sanitized.explanation;
      return sanitized;
    });
  }
  return obj;
};

export const DailyTest = mongoose.model("DailyTest", dailyTestSchema);
