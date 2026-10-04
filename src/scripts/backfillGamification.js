/**
 * One-off migration: initialize missing User.streak subdocuments.
 *
 * Before the streak subdocument was added to the User schema, Mongoose's
 * default `strict: true` silently discarded streak writes. This script now
 * initializes missing streak state only.
 * Historical point ledger documents are retained for archival purposes and
 * are not read or modified by this script.
 *
 * Usage: npm run backfill
 */
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";

async function run() {
  await connectDB();

  const streakSeeded = await User.updateMany(
    {
      $or: [
        { streak: { $exists: false } },
        { streak: null },
      ],
    },
    { $set: { streak: { currentStreak: 0, longestStreak: 0, lastActiveDate: null, freezeCount: 0 } } }
  );

  console.log(`[backfill] streak defaults seeded: ${streakSeeded.modifiedCount}`);
}

run()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("[backfill] failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  });