import mongoose from "mongoose";

const facultySchema = new mongoose.Schema(
  {
    role: {
      type: String,
      default: "faculty",
      enum: ["faculty", "teacher"],
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Faculty name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Faculty email is required"],
      trim: true,
      lowercase: true,
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: true,
    },
    staffId: {
      type: String,
      required: [true, "Faculty Staff ID is required"],
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
    },
    designation: {
      type: String,
      trim: true,
      default: "Assistant Professor",
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      index: true,
    },
    qualification: {
      type: String,
      trim: true,
    },
    experience: {
      type: Number,
      default: 0,
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
  },
  {
    timestamps: true,
    collection: "faculties",
  }
);

facultySchema.methods.comparePassword = function (enteredPassword) {
  return String(enteredPassword || "") === String(this.password || "");
};

facultySchema.methods.toSafeObject = function () {
  const obj = this.toObject ? this.toObject() : { ...this };
  delete obj.password;
  return obj;
};

export const Faculty = mongoose.model("Faculty", facultySchema, "faculties");
export default Faculty;
