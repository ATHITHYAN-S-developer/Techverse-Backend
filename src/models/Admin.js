import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      default: "admin",
      enum: ["admin"],
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Admin name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Admin email is required"],
      trim: true,
      lowercase: true,
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: true,
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
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
    collection: "admins",
  }
);

adminSchema.methods.comparePassword = function (enteredPassword) {
  return String(enteredPassword || "") === String(this.password || "");
};

adminSchema.methods.toSafeObject = function () {
  const obj = this.toObject ? this.toObject() : { ...this };
  delete obj.password;
  return obj;
};

export const Admin = mongoose.model("Admin", adminSchema, "admins");
export default Admin;
