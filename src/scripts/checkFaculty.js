import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/techverse");
  console.log("Connected to MongoDB");

  const depts = await mongoose.connection.db.collection("departments").find().toArray();
  console.log("=== DEPARTMENTS ===");
  depts.forEach(d => console.log(`${d._id} | ${d.code} | ${d.name}`));

  const faculty = await mongoose.connection.db.collection("users").find({
    role: { $in: ["faculty", "teacher", "hod"] }
  }).toArray();
  console.log(`\n=== FACULTY MEMBERS (${faculty.length}) ===`);
  faculty.forEach(f => console.log(`${f._id} | ${f.role} | ${f.staffId} | ${f.name} | ${f.email} | dept: ${f.departmentId} / ${f.departmentCode}`));

  await mongoose.disconnect();
}

main().catch(console.error);
