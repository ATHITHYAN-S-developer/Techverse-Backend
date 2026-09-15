import mongoose from "mongoose";

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
