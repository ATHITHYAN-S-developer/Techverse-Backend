import mongoose from "mongoose";

const techPulsePostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Post title is required"],
      trim: true,
    },
    url: {
      type: String,
      required: [true, "Post URL is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "General",
      index: true,
    },
    platform: {
      type: String,
      default: "",
    },
    logoUrl: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    featured: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const TechPulsePost = mongoose.model("TechPulsePost", techPulsePostSchema);
