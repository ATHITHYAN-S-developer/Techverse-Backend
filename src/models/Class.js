import mongoose from "mongoose";

const classSchema = new mongoose.Schema(
  {
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department reference is required"],
      index: true,
    },
    year: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    section: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    className: {
      type: String,
      required: [true, "Class display name is required (e.g. II CSE - A)"],
      trim: true,
    },
    classAdvisor: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

classSchema.index({ departmentId: 1, year: 1, semester: 1, section: 1 }, { unique: true });

export const Class = mongoose.model("Class", classSchema);
