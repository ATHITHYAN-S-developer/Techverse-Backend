import mongoose from "mongoose";

const visitorSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      sparse: true,
      index: true,
    },
    date: {
      type: String,
      sparse: true,
      index: true,
    },
    totalVisits: {
      type: Number,
      default: 0,
      min: 0,
    },
    resourceViews: {
      type: Number,
      default: 0,
    },
    courseViews: {
      type: Number,
      default: 0,
    },
    announcementViews: {
      type: Number,
      default: 0,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const Visitor = mongoose.model("Visitor", visitorSchema);
