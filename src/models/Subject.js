import mongoose from "mongoose";

const unitSchema = new mongoose.Schema(
  {
    unitNumber: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    topics: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { _id: false }
);

const subjectSchema = new mongoose.Schema(
  {
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department reference is required"],
      index: true,
    },
    code: {
      type: String,
      required: [true, "Subject code is required (e.g. CS8492)"],
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    credits: {
      type: Number,
      default: 3,
    },
    units: [unitSchema],
    assignedTeachers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

subjectSchema.index({ departmentId: 1, code: 1 }, { unique: true });

export const Subject = mongoose.model("Subject", subjectSchema);
