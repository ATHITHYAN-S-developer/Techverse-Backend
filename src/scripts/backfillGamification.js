/**
 * One-off migration: populate User.points / User.streak.
 *
 * Before the gamification subdocuments were added to the User schema, Mongoose's
 * default `strict: true` silently discarded every write from pointsService and
 * streakService. Existing students therefore have no points or streak at all.
 * This script seeds the defaults, then re-derives the points total from the
 * Point ledger so historical awards are not lost.
 *
 * Usage: npm run backfill
 */
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Point } from "../models/Point.js";

const POINTS_PER_LEVEL = 300;

async function run() {
  await connectDB();

  const seeded = await User.updateMany(
    {
      $or: [
        { points: { $exists: false } },
        { points: null },
      ],
    },
    { $set: { points: { totalPoints: 0, level: 1, rank: 1 } } }
  );

  const streakSeeded = await User.updateMany(
    {
      $or: [
        { streak: { $exists: false } },
        { streak: null },
      ],
    },
    { $set: { streak: { currentStreak: 0, longestStreak: 0, lastActiveDate: null, freezeCount: 0 } } }
  );

  // Re-derive totals from the ledger: the aggregate can be wrong if a Point row
  // was written after a failed User.save(), and it is the source of truth.
  const totals = await Point.aggregate([
    { $group: { _id: "$studentId", total: { $sum: "$points" } } },
  ]);

  let synced = 0;
  for (const { _id, total } of totals) {
    const result = await User.updateOne(
      { _id },
      { $set: { "points.totalPoints": total, "points.level": Math.floor(total / POINTS_PER_LEVEL) + 1 } }
    );
    if (result.modifiedCount > 0) synced += 1;
  }

  console.log(
    [
      "[backfill] points defaults seeded:  ", seeded.modifiedCount,
      "[backfill] streak defaults seeded: ", streakSeeded.modifiedCount,
      "[backfill] totals re-derived for:   ", synced,
    ].join("\n")
  );
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