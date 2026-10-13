import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function getMdeDetails() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/techverse");

  console.log("=== MDE FACULTY / USERS ===");
  const usersCol = mongoose.connection.db.collection("users");
  const facultyUsers = await usersCol.find({
    $or: [
      { staffId: { $regex: /m(e)?de/i } },
      { email: { $regex: /m(e)?de/i } },
      { department: { $regex: /Medical Electronics|MDE/i } }
    ]
  }).toArray();

  for (const u of facultyUsers) {
    console.log(`User: ${u.name} | StaffID: ${u.staffId} | Email: ${u.email} | Role: ${u.role} | Dept: ${u.department} | IsHOD: ${u.isHod || u.role === 'hod'}`);
  }

  console.log("\n=== MDE FACULTY COLLECTION ===");
  const facCol = mongoose.connection.db.collection("faculties");
  const facDocs = await facCol.find({
    $or: [
      { staffId: { $regex: /m(e)?de/i } },
      { email: { $regex: /m(e)?de/i } },
      { department: { $regex: /Medical Electronics|MDE/i } }
    ]
  }).toArray();
  for (const f of facDocs) {
    console.log(`Faculty: ${f.name} | StaffID: ${f.staffId} | Designation: ${f.designation} | Dept: ${f.department} | Email: ${f.email}`);
  }

  console.log("\n=== MDE STUDENTS ===");
  const studCol = mongoose.connection.db.collection("students");
  const studDocs = await studCol.find({
    $or: [
      { department: { $regex: /Medical Electronics|MDE/i } },
      { rollNo: { $regex: /m(e)?de/i } },
      { registerNumber: { $regex: /m(e)?de/i } }
    ]
  }).limit(50).toArray();

  const totalMdeStud = await studCol.countDocuments({
    $or: [
      { department: { $regex: /Medical Electronics|MDE/i } },
      { rollNo: { $regex: /m(e)?de/i } },
      { registerNumber: { $regex: /m(e)?de/i } }
    ]
  });

  console.log(`Total MDE Students found: ${totalMdeStud}`);
  studDocs.forEach(s => {
    console.log(`Student: ${s.name} | RollNo: ${s.rollNo} | RegNo: ${s.registerNumber} | Batch: ${s.batch} | Year: ${s.year} | Dept: ${s.department}`);
  });

  // Also check if any student has rollNo pattern with MDE
  const allStudPatterns = await studCol.find({
    $or: [
      { rollNo: { $regex: /MDE/i } },
      { registerNumber: { $regex: /MDE/i } }
    ]
  }).limit(10).toArray();
  console.log(`Students with MDE in rollNo/regNo: ${allStudPatterns.length}`);

  await mongoose.disconnect();
}

getMdeDetails().catch(err => {
  console.error(err);
  process.exit(1);
});
