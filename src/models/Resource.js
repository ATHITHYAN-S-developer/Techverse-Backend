import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department reference is required"],
      index: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject reference is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Resource title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: [
        "notes",
        "question_bank",
        "previous_paper",
        "lab_manual",
        "software",
        "video",
        "reference",
        "project",
        "syllabus",
        "website",
      ],
      default: "notes",
      index: true,
    },
    fileUrl: {
      type: String,
      default: "",
    },
    downloadUrl: {
      type: String,
      default: "",
    },
    externalUrl: {
      type: String,
      default: "",
    },
    originalName: {
      type: String,
      default: "",
    },
    mimeType: {
      type: String,
      default: "application/octet-stream",
    },
    fileType: {
      type: String,
      default: "application/pdf",
    },
    unit: {
      type: Number,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploaderRole: {
      type: String,
      enum: ["teacher", "admin", "student"],
      default: "teacher",
    },
    fileSize: {
      type: String,
      default: "2.4 MB",
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    downloadsCount: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Resource = mongoose.model("Resource", resourceSchema);
