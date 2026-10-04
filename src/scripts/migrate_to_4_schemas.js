import mongoose from "mongoose";
import { ENV } from "../config/env.js";

async function migrate() {
  console.log("Connecting to MongoDB:", ENV.MONGO_URI);
  await mongoose.connect(ENV.MONGO_URI);
  const db = mongoose.connection.db;

  const usersCollection = db.collection("users");
  const exists = await usersCollection.countDocuments({});
  console.log(`Found ${exists} documents in 'users' collection.`);

  const users = await usersCollection.find({}).toArray();

  const students = [];
  const faculties = [];
  const hods = [];
  const admins = [];

  for (const u of users) {
    if (u.role === "student") {
      students.push(u);
    } else if (u.role === "hod" || (u.staffId && u.staffId.includes("104")) || (u.designation && u.designation.toLowerCase().includes("hod"))) {
      u.role = "hod";
      hods.push(u);
    } else if (u.role === "admin") {
      admins.push(u);
    } else {
      // Faculty / teacher
      u.role = "faculty";
      faculties.push(u);
    }
  }

  console.log(`Prepared collections:
  - students: ${students.length}
  - faculties: ${faculties.length}
  - hods: ${hods.length}
  - admins: ${admins.length}`);

  const studentsColl = db.collection("students");
  const facultiesColl = db.collection("faculties");
  const hodsColl = db.collection("hods");
  const adminsColl = db.collection("admins");

  // Clear existing if any to avoid duplication
  await studentsColl.deleteMany({});
  await facultiesColl.deleteMany({});
  await hodsColl.deleteMany({});
  await adminsColl.deleteMany({});

  if (students.length) await studentsColl.insertMany(students);
  if (faculties.length) await facultiesColl.insertMany(faculties);
  if (hods.length) await hodsColl.insertMany(hods);
  if (admins.length) await adminsColl.insertMany(admins);

  console.log("Documents successfully inserted into students, faculties, hods, and admins!");

  // Now drop the 'users' collection
  try {
    await usersCollection.drop();
    console.log("Successfully dropped 'users' collection from MongoDB!");
  } catch (err) {
    console.log("Error dropping 'users' or collection already dropped:", err.message);
  }

  // Verify collections in DB
  const collections = await db.listCollections().toArray();
  console.log("\nCurrent collections in DB:");
  for (const c of collections) {
    if (["users", "students", "faculties", "hods", "admins"].includes(c.name)) {
      const count = await db.collection(c.name).countDocuments({});
      console.log(` - ${c.name}: ${count} documents`);
    }
  }

  await mongoose.disconnect();
  console.log("Migration complete!");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
