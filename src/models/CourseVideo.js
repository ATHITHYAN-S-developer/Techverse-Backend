import mongoose from "mongoose";

const courseVideoSchema = new mongoose.Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseModule",
      required: [true, "Module reference is required"],
      index: true,
    },
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
  {
    timestamps: true,
  }
);

export const CourseVideo = mongoose.model("CourseVideo", courseVideoSchema);
