import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Department } from "../models/Department.js";
import { Class } from "../models/Class.js";

/**
 * Brings an existing local database's core accounts up to the current
 * credential type without wiping the rest of the data:
 *
 *  - admin signs in as `admin` / `VcetTech@123`
 *  - CSE lead is now an HOD account `VCET-FAC-CSE-104`
 *  - AI&DS faculty `VCET-FAC-AIDS-201`
 *  - students sign in with register number + date of birth (the stored
 *    password mirrors the date of birth, yyyy-MM-dd)
 *
 * Idempotent: safe to re-run.
 */

const dob = (y, m, d) => new Date(Date.UTC(y, m, d));

async function syncCredentials() {
  try {
    await connectDB();

    const cse = await Department.findOne({ code: "CSE" }).select("_id");
    const aids = await Department.findOne({ code: "AI&DS" }).select("_id");
    const cseClass = await Class.findOne({
      departmentId: cse?._id,
      year: 3,
      semester: 5,
      section: "A",
    }).select("_id");

    const upsert = async (filter, values) => {
      const user = await User.findOneAndUpdate(filter, values, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });
      return user;
    };

    let admin = await upsert({ username: "admin" }, {
      $set: {
        role: "admin",
        username: "admin",
        password: "VcetTech@123", // Plain-text per project specifications
        name: "VCET System Administrator",
        email: "admin@vcet.ac.in",
        isActive: true,
      },
    });

    let hod = await upsert({ staffId: "VCET-FAC-CSE-104" }, {
      $set: {
        role: "hod",
        staffId: "VCET-FAC-CSE-104",
        password: "faculty123",
        name: "Dr. K. S. Sendhilkumar",
        email: "sendhilkumar@vcet.ac.in",
        departmentId: cse?._id,
        departmentCode: "CSE",
        departmentName: "Computer Science & Engineering",
        department: "Computer Science & Engineering",
        designation: "Head of the Department (HOD)",
        isActive: true,
      },
    });

    let faculty = await upsert({ staffId: "VCET-FAC-AIDS-201" }, {
      $set: {
        role: "faculty",
        staffId: "VCET-FAC-AIDS-201",
        password: "faculty123",
        name: "Dr. M. Sangeetha",
        email: "sangeetha@vcet.ac.in",
        departmentId: aids?._id,
        departmentCode: "AI&DS",
        departmentName: "Artificial Intelligence & Data Science",
        department: "Artificial Intelligence & Data Science",
        designation: "Assistant Professor (Sr. Gr)",
        isActive: true,
      },
    });

    // Student 1: existing account was 732924CSE001; the new register format for
    // the CSE Regular branch is CSR, and the roster move keeps the same person.
    const student1Dob = dob(2006, 6, 20); // 20/07/2006
    let student1 = await upsert(
      {
        $or: [
          { registerNumber: "732924CSR014" },
          { registerNumber: "732924CSE001" },
        ],
      },
      {
        $set: {
          role: "student",
          registerNumber: "732924CSR014",
          password: "2006-07-20", // mirrors date of birth (yyyy-MM-dd)
          name: "Athithyan S",
          email: "732924csr014@vcet.ac.in",
          dateOfBirth: student1Dob,
          departmentId: cse?._id,
          departmentCode: "CSE",
          departmentName: "Computer Science & Engineering",
          department: "Computer Science & Engineering",
          classId: cseClass?._id,
          isActive: true,
        },
      }
    );

    const student2Dob = dob(2007, 4, 11); // 11/05/2007
    let student2 = await upsert({ registerNumber: "732924CSE042" }, {
      $set: {
        role: "student",
        registerNumber: "732924CSE042",
        password: "2007-05-11", // mirrors date of birth (yyyy-MM-dd)
        name: "Kavya Dharshini P",
        email: "732924cse042@vcet.ac.in",
        dateOfBirth: student2Dob,
        departmentId: cse?._id,
        departmentCode: "CSE",
        departmentName: "Computer Science & Engineering",
        department: "Computer Science & Engineering",
        classId: cseClass?._id,
        isActive: true,
      },
    });

    console.log("\n========================================================");
    console.log("✅ LOCAL CREDENTIALS SYNCED TO NEW TYPE");
    console.log("========================================================");
    console.log("👤 Admin:    username      = admin                 | password: VcetTech@123");
    console.log("👨‍🏫 HOD CSE:  staffId       = VCET-FAC-CSE-104     | password: faculty123");
    console.log("👩‍🏫 Faculty:  staffId       = VCET-FAC-AIDS-201    | password: faculty123");
    console.log("🎓 Student:  register      = 732924CSR014          | dateOfBirth: 20/07/2006");
    console.log("🎓 Student:  register      = 732924CSE042          | dateOfBirth: 11/05/2007");
    console.log("========================================================\n");

    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Sync failed:", error);
    process.exit(1);
  }
}

syncCredentials();