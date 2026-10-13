import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { User } from "../models/User.js";
import { Department } from "../models/Department.js";

const DUMMY_PASSWORD = "Dummy@123";

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/techverse");
  console.log("Connected to MongoDB");

  const departments = await Department.find({}).sort({ code: 1 });
  if (!departments.length) {
    console.error("No departments found. Run the database seeder first.");
    process.exit(1);
  }

  const ready = [];

  for (const dept of departments) {
    const code = (dept.code || "GEN").toUpperCase();
    const email = `dummy.faculty.${code.toLowerCase()}@vcet.ac.in`;
    const staffId = `DUMMY-FAC-${code}`;

    let faculty = await User.findOne({ $or: [{ email }, { staffId }] });

    const dummyData = {
      name: `Dummy Faculty (${code})`,
      email,
      password: DUMMY_PASSWORD,
      role: "faculty",
      staffId,
      designation: "Guest Faculty",
      qualification: "M.E.",
      departmentId: dept._id,
      departmentCode: code,
      departmentName: dept.name,
      department: code,
      courseCode: code,
      phone: "",
      contactPhone: "",
      bio: "Placeholder faculty account used for course assignment when no coordinator is available.",
      isActive: true,
      points: { totalPoints: 0, level: 1, rank: 1 },
      streak: { currentStreak: 0, longestStreak: 0, freezeCount: 0 },
    };

    if (faculty) {
      Object.assign(faculty, dummyData);
      await faculty.save();
      console.log(`Updated dummy faculty for ${code}:`, faculty._id);
    } else {
      faculty = await User.create(dummyData);
      console.log(`Created dummy faculty for ${code}:`, faculty._id);
    }

    ready.push(faculty);
  }

  console.log(`\n=== DUMMY FACULTY READY (${ready.length}) ===`);
  for (const f of ready) {
    console.log(`${f.departmentCode}: ${f.name} | ${f.staffId} | ${f.email}`);
  }
  console.log(`Password for all dummy accounts: ${DUMMY_PASSWORD} (stored hashed)`);
  console.log("=========================================\n");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
