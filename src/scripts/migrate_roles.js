import mongoose from "mongoose";

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/techverse");
  const db = mongoose.connection.db;

  // 1. Dr. K. S. Sendhilkumar -> hod
  await db.collection("users").updateOne(
    { email: "sendhilkumar@vcet.ac.in" },
    { $set: { role: "hod" } }
  );

  // 2. Dr. S. Athithyan / Sangeetha -> faculty
  await db.collection("users").updateOne(
    { email: "sangeetha@vcet.ac.in" },
    { $set: { role: "faculty" } }
  );

  // 3. Any other teacher -> faculty
  await db.collection("users").updateMany(
    { role: "teacher" },
    { $set: { role: "faculty" } }
  );

  const users = await db.collection("users").find({}, { projection: { name: 1, email: 1, role: 1, staffId: 1, designation: 1 } }).toArray();
  console.log("UPDATED USERS IN DB:", JSON.stringify(users, null, 2));
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
