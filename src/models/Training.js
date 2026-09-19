import mongoose from "mongoose";

const resourceItemSchema = new mongoose.Schema({
  name: String,
  url: String,
  type: { type: String },
});

const trainingTrackSchema = new mongoose.Schema(
  {
    trackId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    icon: { type: String, default: "Target" },
    badge: { type: String, default: "" },
    category: { type: String, default: "" },
    level: { type: String, default: "" },
    duration: { type: String, default: "" },
    description: { type: String, default: "" },
    topics: [{ type: String }],
    resources: [resourceItemSchema],
  },
  { timestamps: true }
);

const bootcampSchema = new mongoose.Schema(
  {
    bootcampId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    trainer: { type: String, default: "" },
    date: { type: String, default: "" },
    time: { type: String, default: "" },
    mode: { type: String, default: "" },
    eligible: { type: String, default: "" },
    seats: { type: String, default: "" },
    status: { type: String, default: "Upcoming" },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

const toolkitSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: { type: String, default: "" },
    size: { type: String, default: "" },
    downloads: { type: String, default: "" },
    url: { type: String, default: "" },
    desc: { type: String, default: "" },
  },
  { timestamps: true }
);

export const TrainingTrack = mongoose.model("TrainingTrack", trainingTrackSchema);
export const Bootcamp = mongoose.model("Bootcamp", bootcampSchema);
export const Toolkit = mongoose.model("Toolkit", toolkitSchema);
