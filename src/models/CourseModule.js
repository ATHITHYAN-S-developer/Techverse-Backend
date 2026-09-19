import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Video title is required"],
      trim: true,
    },
    youtubeUrl: {
      type: String,
      required: [true, "YouTube URL is required"],
      trim: true,
    },
    youtubeVideoId: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    duration: {
      type: String,
      default: "15 mins",
    },
    order: {
      type: Number,
      default: 1,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const testCaseSchema = new mongoose.Schema({
  input: { type: String, default: "" },
  output: { type: String, default: "" },
  isHidden: { type: Boolean, default: false },
});

const codingProblemSchema = new mongoose.Schema(
  {
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
      default: "1 <= N <= 10^5\nTime Limit: 2.0s\nMemory: 256MB",
    },
    inputFormat: {
      type: String,
      default: "First line contains integer N followed by elements.",
    },
    outputFormat: {
      type: String,
      default: "Print the required output on a single line.",
    },
    supportedLanguages: {
      type: [String],
      default: ["javascript", "python", "java", "cpp"],
    },
    starterCode: {
      type: String,
      default: "function solution(input) {\n  // Write your code here\n  return input;\n}",
    },
    testCases: {
      type: [testCaseSchema],
      default: () => [{ input: "5\n1 2 3 4 5", output: "15", isHidden: false }],
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
  { timestamps: true }
);

const mcqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
    },
    options: {
      type: [String],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length >= 2;
        },
        message: "An MCQ must provide at least 2 options",
      },
      required: true,
    },
    correctAnswer: {
      type: Number, // 0-based index
      required: [true, "Correct answer index is required"],
      default: 0,
    },
    correctAnswerText: {
      type: String,
      default: "",
    },
    explanation: {
      type: String,
      default: "",
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    marks: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

const courseModuleSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"],
      index: true,
    },
    moduleNumber: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: [true, "Module title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    // Content flags: Video is ALWAYS true (mandatory)
    hasVideo: {
      type: Boolean,
      default: true,
      required: true,
    },
    hasCoding: {
      type: Boolean,
      default: false,
    },
    hasMCQ: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 1,
    },
    // Separate embedded content arrays
    videos: {
      type: [videoSchema],
      default: [],
    },
    codingProblems: {
      type: [codingProblemSchema],
      default: [],
    },
    mcqs: {
      type: [mcqSchema],
      default: [],
    },
    // Legacy / Convenience fields
    videoUrl: {
      type: String,
      default: "",
    },
    content: {
      type: String,
      default: "",
    },
    resources: [
      {
        name: String,
        size: String,
        url: String,
      },
    ],
    estimatedMinutes: {
      type: Number,
      default: 45,
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

courseModuleSchema.index({ courseId: 1, moduleNumber: 1 });

// Ensure hasVideo is always true
courseModuleSchema.pre("validate", function (next) {
  if (this.hasVideo === false) {
    return next(new Error("Video is mandatory for all course modules. hasVideo cannot be false."));
  }
  this.hasVideo = true;

  // Sync legacy videoUrl with the first video if available
  if (this.videos && this.videos.length > 0 && !this.videoUrl) {
    this.videoUrl = this.videos[0].youtubeUrl;
  }
  next();
});

export const CourseModule = mongoose.model("CourseModule", courseModuleSchema);
