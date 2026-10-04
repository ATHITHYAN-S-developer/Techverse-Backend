import mongoose from "mongoose";

const hodSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      default: "hod",
      enum: ["hod"],
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "HOD name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "HOD email is required"],
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
      required: [true, "Staff ID is required"],
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
    },
    designation: {
      type: String,
      trim: true,
      default: "Associate Professor & HOD i/c",
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
    collection: "hods",
  }
);

hodSchema.methods.comparePassword = function (enteredPassword) {
  return String(enteredPassword || "") === String(this.password || "");
};

hodSchema.methods.toSafeObject = function () {
  const obj = this.toObject ? this.toObject() : { ...this };
  delete obj.password;
  return obj;
};

export const Hod = mongoose.model("Hod", hodSchema, "hods");
export default Hod;
