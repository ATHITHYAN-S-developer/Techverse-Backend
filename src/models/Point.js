import mongoose from "mongoose";

const pointSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
    type: {
      type: String,
      enum: [
        "daily_test",
        "streak_7",
        "streak_14",
        "streak_30",
        "perfect_score",
        "module_completion",
        "course_completion",
        "coding_challenge",
        "bonus",
      ],
      required: true,
      index: true,
    },
    points: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    referenceId: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const Point = mongoose.model("Point", pointSchema);
