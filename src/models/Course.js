import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    courseDescription: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "Programming",
      index: true,
    },
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced", "Beginner to Intermediate", "Beginner → Intermediate", "Intermediate to Advanced"],
      default: "Beginner",
    },
    instructor: {
      type: String,
      default: "VCET Faculty Coordinator",
    },
    instructorName: {
      type: String,
      default: "VCET Faculty Coordinator",
    },
    thumbnail: {
      type: String,
      default: "",
    },
    thumbnailUrl: {
      type: String,
      default: "",
    },
    duration: {
      type: String,
      default: "30 Days",
    },
    durationDays: {
      type: Number,
      default: 30,
    },
    totalModules: {
      type: Number,
      default: 5,
    },
    totalTests: {
      type: Number,
      default: 5,
    },
    passingScore: {
      type: Number,
      default: 50,
    },
    passingPercentage: {
      type: Number,
      default: 50,
    },
    certificateEnabled: {
      type: Boolean,
      default: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
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

courseSchema.pre("save", function (next) {
  if (!this.instructorName && this.instructor) {
    this.instructorName = this.instructor;
  } else if (!this.instructor && this.instructorName) {
    this.instructor = this.instructorName;
  }
  if (!this.passingPercentage && this.passingScore) {
    this.passingPercentage = this.passingScore;
  }
  if (!this.thumbnailUrl && this.thumbnail) {
    this.thumbnailUrl = this.thumbnail.startsWith("http") ? this.thumbnail : `/uploads/courses/${this.thumbnail}`;
  }
  next();
});

export const Course = mongoose.model("Course", courseSchema);
