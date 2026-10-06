import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { Course } from "../models/Course.js";
import { User } from "../models/User.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/techverse");
  const user = await User.findOne({ email: "senthamarai@vcet.ac.in" });
  console.log("User:", user._id, user.name, user.role);

  // Check with isPublished: true
  const c1 = await Course.find({
    isPublished: true,
    $or: [
      { assignedFacultyId: user._id },
      { assignedFacultyName: user.name }
    ]
  });
  console.log("Courses with isPublished:true ->", c1.map(c => ({ id: c._id, title: c.title, isPublished: c.isPublished })));

  // Check all assigned courses
  const c2 = await Course.find({
    $or: [
      { assignedFacultyId: user._id },
      { assignedFacultyName: user.name }
    ]
  });
  console.log("All assigned courses ->", c2.map(c => ({ id: c._id, title: c.title, isPublished: c.isPublished })));

  await mongoose.disconnect();
}
main().catch(console.error);
