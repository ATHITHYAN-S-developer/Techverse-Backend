import mongoose from "mongoose";
import { hashPassword, hashUpdatePasswords, isHashed, verifyPassword } from "../utils/password.js";

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
      enum: ["student", "teacher", "faculty", "hod", "admin"],
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
      select: true,
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
    departmentCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    departmentName: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
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

    // Teacher & Faculty & HOD specific fields
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
    qualification: {
      type: String,
      trim: true,
    },
    experience: {
      type: Number,
      default: 0,
    },

    // Admin-specific fields
    username: {
      type: String,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },
    contactPhone: {
      type: String,
      trim: true,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      default: "",
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
    strict: false,
    collection: "users",
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

// Hash the password on every write path so plain text never reaches the
// `users` collection.

// Document saves (.create / .save()).
userSchema.pre("save", async function () {
  if (this.isModified("password") && this.password && !isHashed(this.password)) {
    this.password = await hashPassword(this.password);
  }
});

// Bulk inserts (User.insertMany in the seeders) do not run `save` middleware.
userSchema.pre("insertMany", function (next, docs) {
  if (!Array.isArray(docs)) return next();
  Promise.all(
    docs.map(async (doc) => {
      if (doc && doc.password && !isHashed(doc.password)) {
        doc.password = await hashPassword(doc.password);
      }
    })
  )
    .then(() => next())
    .catch(next);
});

// Query-level writes (upserts in the import / seed scripts, admin resets).
for (const op of ["findOneAndUpdate", "updateOne", "updateMany"]) {
  userSchema.pre(op, async function () {
    const update = this.getUpdate();
    await hashUpdatePasswords(update);
    this.setUpdate(update);
  });
}

// Verify a supplied password against the stored bcrypt hash, falling back to a
// legacy plain-text comparison for accounts that have not been migrated yet.
userSchema.methods.comparePassword = function (enteredPassword) {
  return verifyPassword(enteredPassword, this.password);
};

// Safe JSON serialization helper (strips password)
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject ? this.toObject() : { ...this };
  delete obj.password;
  return obj;
};

export const User = mongoose.models.User || mongoose.model("User", userSchema, "users");

export default User;
