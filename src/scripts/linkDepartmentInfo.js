import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Department } from "../models/Department.js";

async function main() {
  await connectDB();
  const db = mongoose.connection.db;

  // 1. Update HOD user
  const hodUser = await User.findById("6ac07223f2a199cd63a29e45");
  if (hodUser && hodUser.departmentId) {
    const dept = await Department.findById(hodUser.departmentId);
    if (dept) {
      await db.collection("users").updateOne(
        { _id: hodUser._id },
        {
          $set: {
            departmentCode: dept.code,
            departmentName: dept.name,
            department: dept.name,
          },
        }
      );

      await db.collection("hods").updateOne(
        { _id: hodUser._id },
        {
          $set: {
            departmentCode: dept.code,
            departmentName: dept.name,
            department: dept.name,
          },
        },
        { upsert: true }
      );

      await db.collection("departments").updateOne(
        { _id: dept._id },
        {
          $set: {
            hodName: hodUser.name,
            hodStaffId: hodUser.staffId,
            hodId: hodUser._id,
          },
        }
      );
      console.log(`✅ Linked HOD "${hodUser.name}" to Department "${dept.name}" (${dept.code})`);
    }
  }

  // 2. Link all faculty/HODs in the DB
  const staff = await User.find({ role: { $in: ["hod", "faculty", "teacher"] } });
  for (const s of staff) {
    if (s.departmentId) {
      const d = await Department.findById(s.departmentId);
      if (d) {
        await db.collection("users").updateOne(
          { _id: s._id },
          {
            $set: {
              departmentCode: d.code,
              departmentName: d.name,
              department: d.name,
            },
          }
        );
        const coll = s.role === "hod" ? "hods" : "faculties";
        await db.collection(coll).updateOne(
          { _id: s._id },
          {
            $set: {
              departmentCode: d.code,
              departmentName: d.name,
              department: d.name,
            },
          },
          { upsert: true }
        );
        console.log(`✅ Updated ${s.role}: "${s.name}" -> Dept: ${d.code} (${d.name})`);
      }
    }
  }

  // 3. Verify
  const verifiedUser = await db.collection("users").findOne({ _id: hodUser._id });
  console.log("\n--- VERIFIED USER RECORD IN DB ---");
  console.log(JSON.stringify(verifiedUser, null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);
