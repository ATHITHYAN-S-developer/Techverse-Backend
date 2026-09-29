import mongoose from "mongoose";

const pointsSchema = new mongoose.Schema(
  {
    totalPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
    rank: {
      type: Number,
      default: 1,
    },
  },
  { _id: false }
);

const streakSchema = new mongoose.Schema(
  {
    currentStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Local calendar day (YYYY-MM-DD) of the student's last counted activity.
    lastActiveDate: {
      type: String,
      default: null,
    },
    freezeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      required: [true, "User role is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: true, // Plain text password as explicitly required
    },

    // Student-specific fields
    registerNumber: {
      type: String,
      trim: true,
      uppercase: true,
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
    // Denormalised from departmentId so roster imports and reports do not need
    // an extra join, and so the portal can label a branch without aggregating.
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

    // Teacher-specific fields
    staffId: {
      type: String,
      trim: true,
      uppercase: true,
    },
    designation: {
      type: String,
      trim: true,
      default: "Assistant Professor",
    },

    // Admin-specific fields
    username: {
      type: String,
      trim: true,
      lowercase: true,
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

    // Gamification aggregates. Maintained by pointsService / streakService.
    points: {
      type: pointsSchema,
      default: () => ({}),
    },
    streak: {
      type: streakSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Unique Sparse Indexes for identifiers
userSchema.index({ registerNumber: 1 }, { unique: true, sparse: true });
userSchema.index({ staffId: 1 }, { unique: true, sparse: true });
userSchema.index({ username: 1 }, { unique: true, sparse: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ "points.totalPoints": -1 });
userSchema.index({ "streak.currentStreak": -1 });
userSchema.index({ role: 1, courseCode: 1 });
userSchema.index({ role: 1, batchStartYear: 1 });

// Plain-text password comparison method
userSchema.methods.comparePassword = function (enteredPassword) {
  return String(enteredPassword || "") === String(this.password || "");
};

// Safe JSON serialization helper (strips password)
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject ? this.toObject() : { ...this };
  delete obj.password;
  return obj;
};

export const User = mongoose.model("User", userSchema);
