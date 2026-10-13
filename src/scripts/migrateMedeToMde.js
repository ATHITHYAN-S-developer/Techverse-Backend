import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function migrateMedeToMde() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/techverse");
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;

  // 1. Update Users
  const userMatches = await db.collection("users").find({
    $or: [
      { staffId: { $regex: /MEDE/i } },
      { email: { $regex: /vcetmede/i } }
    ]
  }).toArray();

  console.log(`Found ${userMatches.length} matching users to update:`);
  for (const user of userMatches) {
    const newStaffId = user.staffId ? user.staffId.replace(/MEDE/gi, "MDE") : user.staffId;
    const newEmail = user.email ? user.email.replace(/vcetmede/gi, "vcetmde") : user.email;
    
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          staffId: newStaffId,
          email: newEmail
        }
      }
    );
    console.log(`  Updated user: ${user.name} | ${user.staffId} -> ${newStaffId} | ${user.email} -> ${newEmail}`);
  }

  // 2. Update Faculties
  const facultyMatches = await db.collection("faculties").find({
    $or: [
      { staffId: { $regex: /MEDE/i } },
      { email: { $regex: /vcetmede/i } }
    ]
  }).toArray();

  console.log(`Found ${facultyMatches.length} matching faculties to update:`);
  for (const fac of facultyMatches) {
    const newStaffId = fac.staffId ? fac.staffId.replace(/MEDE/gi, "MDE") : fac.staffId;
    const newEmail = fac.email ? fac.email.replace(/vcetmede/gi, "vcetmde") : fac.email;
    
    await db.collection("faculties").updateOne(
      { _id: fac._id },
      {
        $set: {
          staffId: newStaffId,
          email: newEmail
        }
      }
    );
    console.log(`  Updated faculty: ${fac.name} | ${fac.staffId} -> ${newStaffId} | ${fac.email} -> ${newEmail}`);
  }

  // 3. Check any other collections
  const allCols = await db.listCollections().toArray();
  for (const colInfo of allCols) {
    if (colInfo.name === "users" || colInfo.name === "faculties") continue;
    const col = db.collection(colInfo.name);
    const count = await col.countDocuments({
      $or: [
        { staffId: { $regex: /MEDE/i } },
        { instructorId: { $regex: /MEDE/i } },
        { facultyId: { $regex: /MEDE/i } },
        { email: { $regex: /MEDE/i } }
      ]
    });
    if (count > 0) {
      console.log(`Found ${count} in ${colInfo.name}, updating...`);
      // Update fields if any found
      await col.updateMany(
        { staffId: { $regex: /MEDE/i } },
        [{ $set: { staffId: { $replaceOne: { input: "$staffId", find: "MEDE", replacement: "MDE" } } } }]
      );
    }
  }

  console.log("Migration complete!");
  await mongoose.disconnect();
}

migrateMedeToMde().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
