import mongoose from "mongoose";

const streakSchema = new mongoose.Schema(
  {
    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    lastActiveDate: { type: String, default: null },
    freezeCount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const studentSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      default: "student",
      enum: ["student"],
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Student email is required"],
      trim: true,
      lowercase: true,
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: true,
    },
    registerNumber: {
      type: String,
      required: [true, "Register number is required"],
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },
    year: {
      type: Number,
      min: 1,
      max: 4,
    },
    semester: {
      type: Number,
      min: 1,
      max: 8,
    },
    section: {
      type: String,
      trim: true,
      uppercase: true,
    },
    dateOfBirth: {
      type: Date,
    },
    courseCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    courseName: {
      type: String,
      trim: true,
    },
    batchStartYear: {
      type: Number,
      min: 2000,
      max: 2100,
    },
    batchEndYear: {
      type: Number,
      min: 2000,
      max: 2100,
    },
    profileImage: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLoginAt: {
      type: Date,
    },
    streak: {
      type: streakSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    collection: "students",
  }
);

studentSchema.index({ "streak.currentStreak": -1 });
studentSchema.index({ courseCode: 1, batchStartYear: 1 });

studentSchema.methods.comparePassword = function (enteredPassword) {
  return String(enteredPassword || "") === String(this.password || "");
};

studentSchema.methods.toSafeObject = function () {
  const obj = this.toObject ? this.toObject() : { ...this };
  delete obj.password;
  return obj;
};

export const Student = mongoose.model("Student", studentSchema, "students");
export default Student;
