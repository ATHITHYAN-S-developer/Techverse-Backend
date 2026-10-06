import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Department } from "../models/Department.js";

async function main() {
  await connectDB();
  const db = mongoose.connection.db;

  console.log("🧹 Starting Database Schema Optimization & Cleanup...\n");

  // 1. Ensure all users in 'users' have departmentCode, departmentName, and department set
  console.log("📌 1. Ensuring department fields on all users in 'users' collection...");
  const departments = await Department.find();
  const deptMap = new Map(departments.map((d) => [d._id.toString(), d]));

  const usersWithDept = await User.find({ departmentId: { $ne: null } });
  let userUpdates = 0;
  for (const u of usersWithDept) {
    const d = deptMap.get(u.departmentId.toString());
    if (d && (!u.departmentCode || !u.departmentName || !u.department)) {
      await db.collection("users").updateOne(
        { _id: u._id },
        {
          $set: {
            departmentCode: d.code,
            departmentName: d.name,
            department: d.name,
          },
        }
      );
      userUpdates++;
    }
  }
  console.log(`✅ Verified/updated department fields on ${userUpdates} users in 'users'.`);

  // 2. Ensure HODs are properly linked in the Department collection
  console.log("\n📌 2. Ensuring HOD links in Department collection...");
  const hods = await User.find({ role: "hod" });
  for (const hod of hods) {
    if (hod.departmentId) {
      await Department.findByIdAndUpdate(hod.departmentId, {
        $set: {
          hodName: hod.name,
          hodStaffId: hod.staffId,
          hodId: hod._id,
        },
      });
      console.log(`✅ Department ${hod.departmentCode || "HOD"} linked to ${hod.name} (${hod.staffId})`);
    }
  }

  // 3. Drop redundant duplicate & empty collections
  const collectionsToDrop = [
    "students",
    "faculties",
    "hods",
    "admins",
    "coursevideos",
    "mcqquestions",
    "codingproblems",
    "codingtests",
    "testattempts",
  ];

  console.log("\n📌 3. Dropping legacy redundant/empty collections...");
  const currentCollections = (await db.listCollections().toArray()).map((c) => c.name);

  for (const collName of collectionsToDrop) {
    if (currentCollections.includes(collName)) {
      const docCount = await db.collection(collName).countDocuments();
      console.log(`  Dropping collection '${collName}' (${docCount} documents)...`);
      await db.dropCollection(collName);
      console.log(`  ✅ Dropped '${collName}'.`);
    } else {
      console.log(`  ⏭️ '${collName}' does not exist, skipping.`);
    }
  }

  // 4. Print clean list of remaining collections
  console.log("\n📋 Final Active MongoDB Collections:");
  const finalCollections = await db.listCollections().toArray();
  for (const c of finalCollections.sort((a, b) => a.name.localeCompare(b.name))) {
    const count = await db.collection(c.name).countDocuments();
    console.log(`  • ${c.name.padEnd(22)}: ${count} documents`);
  }

  console.log("\n🎉 Database cleanup and optimization complete!");
  await mongoose.disconnect();
}

main().catch(console.error);
