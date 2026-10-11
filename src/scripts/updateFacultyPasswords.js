import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Faculty } from "../models/Faculty.js";

async function updateFacultyPasswords() {
  try {
    await connectDB();
    const newPassword = "vcet@2026";
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log(`🔒 Hashing new password '${newPassword}'...`);

    // 1. Update User collection
    const userResult = await User.updateMany(
      { role: { $in: ["faculty", "teacher", "hod"] } },
      { $set: { password: hashedPassword } }
    );
    console.log(`✅ Updated ${userResult.modifiedCount} faculty/HOD accounts in 'users' collection.`);

    // 2. Update Faculty collection
    const facultyResult = await Faculty.updateMany(
      {},
      { $set: { password: hashedPassword } }
    );
    console.log(`✅ Updated ${facultyResult.modifiedCount} accounts in 'faculties' collection.`);

    // Verify a sample faculty
    const sample = await User.findOne({ role: "faculty" }).select("+password");
    if (sample) {
      const match = await bcrypt.compare(newPassword, sample.password);
      console.log(`🔍 Verification check for ${sample.staffId} (${sample.name}): Password match = ${match}`);
    }

    await mongoose.disconnect();
    console.log("🎉 All faculty and HOD passwords successfully updated to 'vcet@2026'!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error updating passwords:", err);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

updateFacultyPasswords();
