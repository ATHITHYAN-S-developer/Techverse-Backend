import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { User } from "../models/User.js";
import { Department } from "../models/Department.js";

const OFFICIAL_VCET_DEPARTMENTS = [
  {
    code: "CSE",
    name: "Computer Science & Engineering",
    description: "Department of Computer Science and Engineering, VCET",
    icon: "Cpu",
  },
  {
    code: "AI&DS",
    name: "Artificial Intelligence & Data Science",
    description: "Department of Artificial Intelligence and Data Science, VCET",
    icon: "Brain",
  },
  {
    code: "IT",
    name: "Information Technology",
    description: "Department of Information Technology, VCET",
    icon: "Network",
  },
  {
    code: "ECE",
    name: "Electronics & Communication Engineering",
    description: "Department of Electronics and Communication Engineering, VCET",
    icon: "Radio",
  },
  {
    code: "EEE",
    name: "Electrical & Electronics Engineering",
    description: "Department of Electrical and Electronics Engineering, VCET",
    icon: "Zap",
  },
  {
    code: "MECH",
    name: "Mechanical Engineering",
    description: "Department of Mechanical Engineering, VCET",
    icon: "Cog",
  },
  {
    code: "CIVIL",
    name: "Civil Engineering",
    description: "Department of Civil Engineering, VCET",
    icon: "Building",
  },
  {
    code: "AIML",
    name: "Artificial Intelligence & Machine Learning",
    description: "Department of Artificial Intelligence and Machine Learning, VCET",
    icon: "Cpu",
  },
  {
    code: "BME",
    name: "Bio Medical Engineering",
    description: "Department of Biomedical Engineering, VCET",
    icon: "Activity",
  },
  {
    code: "MDE",
    name: "Medical Electronics",
    description: "Department of Medical Electronics, VCET",
    icon: "HeartPulse",
  },
  {
    code: "MEAE",
    name: "M.E. Applied Electronics",
    description: "Department of Applied Electronics (PG), VCET",
    icon: "Layers",
  },
  {
    code: "MEBME",
    name: "M.E. Bio Medical Engineering",
    description: "Department of Biomedical Engineering (PG), VCET",
    icon: "Activity",
  },
  {
    code: "MECSE",
    name: "M.E. Computer Science and Engineering",
    description: "Department of Computer Science and Engineering (PG), VCET",
    icon: "Server",
  },
  {
    code: "MBA",
    name: "Master of Business Administration",
    description: "Department of Management Studies (MBA), VCET",
    icon: "Briefcase",
  },
];

async function initProductionDB() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/techverse";
  console.log("==================================================");
  console.log("🏭 INITIALIZING TECHVERSE FOR PRODUCTION");
  console.log(`📡 Connecting to MongoDB: ${uri}`);
  console.log("==================================================");

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  // 1. Drop or purge all application collections
  console.log("\n🧹 1. Clearing all existing database collections...");
  const collections = await db.listCollections().toArray();
  for (const c of collections) {
    try {
      await db.collection(c.name).deleteMany({});
      console.log(`   - Cleared collection: ${c.name}`);
    } catch (err) {
      console.warn(`   - Could not clear ${c.name}: ${err.message}`);
    }
  }

  // Drop legacy/empty collections completely
  const legacyDrop = [
    "codingproblems",
    "codingtests",
    "coursevideos",
    "mcqquestions",
    "testattempts",
    "visitors",
  ];
  for (const collName of legacyDrop) {
    try {
      await db.dropCollection(collName).catch(() => { });
    } catch { }
  }

  // 2. Seed Official VCET Departments
  console.log("\n🏛️ 2. Seeding Official VCET Academic Departments (14 Departments)...");
  const insertedDepts = await Department.insertMany(OFFICIAL_VCET_DEPARTMENTS);
  console.log(`   - ✅ Successfully seeded ${insertedDepts.length} VCET Departments.`);

  // 3. Seed Master Administrator Account
  console.log("\n👤 3. Creating Production Master Administrator Account...");
  const adminUser = await User.create({
    role: "admin",
    username: "admin",
    password: process.env.ADMIN_DEFAULT_PASSWORD || "admin123",
    name: "VCET System Administrator",
    email: "admin@vcet.ac.in",
    isActive: true,
  });
  console.log(`   - ✅ Master Admin created successfully:`);
  console.log(`     Username: ${adminUser.username}`);
  console.log(`     Email:    ${adminUser.email}`);
  console.log(`     Role:     ${adminUser.role}`);

  // 4. Verification & Audit Report
  console.log("\n==================================================");
  console.log("📋 PRODUCTION DATABASE AUDIT & STATE");
  console.log("==================================================");

  const finalCollections = await db.listCollections().toArray();
  for (const c of finalCollections.sort((a, b) => a.name.localeCompare(b.name))) {
    const count = await db.collection(c.name).countDocuments();
    console.log(`  • ${c.name.padEnd(25)}: ${count} documents`);
  }

  console.log("\n==================================================");
  console.log("🎉 PRODUCTION DATABASE INITIALIZATION COMPLETE!");
  console.log("==================================================");
  console.log("🔑 Master Admin Credentials:");
  console.log("   • Portal URL: http://<your-server>:5000/login or port 5173");
  console.log("   • Username:   admin (or admin@vcet.ac.in)");
  console.log("   • Password:   admin123");
  console.log("\n📚 To populate the official student & faculty roster:");
  console.log("   Run: npm run import:excel");
  console.log("==================================================\n");

  await mongoose.disconnect();
}

initProductionDB().catch((err) => {
  console.error("❌ Production DB initialization failed:", err);

  