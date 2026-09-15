import mongoose from "mongoose";

const mcqQuestionSchema = new mongoose.Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseModule",
      required: [true, "Module reference is required"],
      index: true,
    },
    question: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length >= 2;
        },
        message: "An MCQ must provide at least 2 options",
      },
    },
    correctAnswer: {
      type: Number,
      required: [true, "Correct answer index is required"],
      default: 0,
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
  {
    timestamps: true,
  }
);

export const MCQQuestion = mongoose.model("MCQQuestion", mcqQuestionSchema);
