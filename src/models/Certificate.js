import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    certificateNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["module_appreciation", "course_completion"],
      default: "module_appreciation",
      index: true,
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseModule",
      default: null,
      index: true,
    },
    moduleNumber: {
      type: Number,
      default: null,
    },
    moduleTitle: {
      type: String,
      default: "",
    },
    studentName: {
      type: String,
      required: true,
    },
    registerNumber: {
      type: String,
      required: true,
    },
    courseName: {
      type: String,
      required: true,
    },
    instructorName: {
      type: String,
      default: "VCET Faculty Lead",
    },
    score: {
      type: Number,
      required: true,
    },
    grade: {
      type: String,
      default: "Distinction",
    },
    verificationCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    certificateUrl: {
      type: String,
      default: "",
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["valid", "revoked"],
      default: "valid",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Certificate = mongoose.model("Certificate", certificateSchema);
