import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { User } from "../models/User.js";
import { Department } from "../models/Department.js";

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/techverse");
  console.log("Connected to MongoDB");

  // Find CSE department
  const cseDept = await Department.findOne({ code: "CSE" });
  if (!cseDept) {
    console.error("CSE Department not found in database!");
    process.exit(1);
  }

  console.log("Found CSE Department:", cseDept._id, cseDept.name);

  // Check if Senthamarai faculty already exists
  let faculty = await User.findOne({
    $or: [
      { email: "senthamarai@vcet.ac.in" },
      { staffId: "VCET-FAC-CSE-105" },
      { name: /Senthamarai/i },
    ]
  });

  const facultyData = {
    name: "Mrs. M. Senthamarai",
    email: "senthamarai@vcet.ac.in",
    password: "Senthamarai@123",
    role: "faculty",
    staffId: "VCET-FAC-CSE-105",
    designation: "Assistant Professor",
    qualification: "M.E., (Ph.D.)",
    departmentId: cseDept._id,
    departmentCode: "CSE",
    departmentName: "Computer Science & Engineering",
    department: "CSE",
    courseCode: "CSE",
    phone: "+91 98421 54321",
    contactPhone: "+91 98421 54321",
    bio: "Faculty member in the Department of Computer Science & Engineering, VCET.",
    isActive: true,
    points: { totalPoints: 100, level: 1, rank: 1 },
    streak: { currentStreak: 5, longestStreak: 12, freezeCount: 0 },
  };

  if (faculty) {
    console.log("Updating existing faculty record:", faculty._id);
    Object.assign(faculty, facultyData);
    await faculty.save();
  } else {
    console.log("Creating new CSE faculty record...");
    faculty = await User.create(facultyData);
  }

  console.log("\n=== CSE FACULTY ACCOUNT CREATED SUCCESSFULLY ===");
  console.log("ID:", faculty._id);
  console.log("Name:", faculty.name);
  console.log("Role:", faculty.role);
  console.log("Staff ID:", faculty.staffId);
  console.log("Email:", faculty.email);
  console.log("Password:", faculty.password);
  console.log("Department:", faculty.departmentName, `(${faculty.departmentCode})`);
  console.log("Department ID:", faculty.departmentId);
  console.log("IsActive:", faculty.isActive);
  console.log("================================================\n");

  await mongoose.disconnect();
}

run().catch(console.error);
